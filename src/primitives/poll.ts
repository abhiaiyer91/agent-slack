/**
 * Poll Primitive
 *
 * Polls enable agents to reach consensus through voting.
 * Useful for decisions like deployments, architectural choices,
 * or prioritization.
 */

import { nanoid } from 'nanoid';
import { EventEmitter } from 'eventemitter3';

/**
 * Vote requirement strategies.
 */
export const VoteRequirement = {
  UNANIMOUS: 'unanimous',     // All must agree
  MAJORITY: 'majority',       // > 50% must agree
  PLURALITY: 'plurality',     // Most votes wins
  ANY: 'any',                 // First vote decides
  THRESHOLD: 'threshold',     // Custom threshold
} as const;

export type VoteRequirement = (typeof VoteRequirement)[keyof typeof VoteRequirement];

/**
 * Poll status.
 */
export const PollStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
  DECIDED: 'decided',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type PollStatus = (typeof PollStatus)[keyof typeof PollStatus];

/**
 * A single vote in a poll.
 */
export interface Vote {
  agentId: string;
  option: string;
  timestamp: Date;
  reasoning?: string;  // Why the agent voted this way
  confidence?: number; // 0-1 confidence in the vote
}

/**
 * Poll configuration.
 */
export interface PollConfig {
  question: string;
  options: string[];
  eligibleVoters?: string[];  // If undefined, any agent can vote
  requirement: VoteRequirement;
  threshold?: number;         // For THRESHOLD requirement (0-1)
  expiresAt?: Date;
  allowChangeVote?: boolean;
  anonymous?: boolean;
  channelId?: string;
  messageId?: string;
}

/**
 * Poll result.
 */
export interface PollResult {
  winner?: string;
  votes: Record<string, number>;
  percentages: Record<string, number>;
  totalVotes: number;
  isDecided: boolean;
  decidedAt?: Date;
}

/**
 * Events emitted by polls.
 */
export interface PollEvents {
  vote: (vote: Vote) => void;
  decided: (result: PollResult) => void;
  expired: () => void;
  closed: () => void;
}

/**
 * A poll for agent voting.
 */
export class Poll extends EventEmitter<PollEvents> {
  readonly id: string;
  readonly question: string;
  readonly options: string[];
  readonly eligibleVoters?: string[];
  readonly requirement: VoteRequirement;
  readonly threshold: number;
  readonly expiresAt?: Date;
  readonly allowChangeVote: boolean;
  readonly anonymous: boolean;
  readonly channelId?: string;
  readonly messageId?: string;
  readonly createdAt: Date;

  private _status: PollStatus = PollStatus.OPEN;
  private readonly _votes: Map<string, Vote> = new Map();
  private _decidedAt?: Date;

  constructor(config: PollConfig) {
    super();
    this.id = nanoid();
    this.question = config.question;
    this.options = config.options;
    this.eligibleVoters = config.eligibleVoters;
    this.requirement = config.requirement;
    this.threshold = config.threshold ?? 0.5;
    this.expiresAt = config.expiresAt;
    this.allowChangeVote = config.allowChangeVote ?? false;
    this.anonymous = config.anonymous ?? false;
    this.channelId = config.channelId;
    this.messageId = config.messageId;
    this.createdAt = new Date();
  }

  get status(): PollStatus {
    // Check expiration
    if (this._status === PollStatus.OPEN && this.expiresAt && new Date() > this.expiresAt) {
      this._status = PollStatus.EXPIRED;
      this.emit('expired');
    }
    return this._status;
  }

  get isOpen(): boolean {
    return this.status === PollStatus.OPEN;
  }

  get isDecided(): boolean {
    return this._status === PollStatus.DECIDED;
  }

  get votes(): Vote[] {
    return Array.from(this._votes.values());
  }

  get voterCount(): number {
    return this._votes.size;
  }

  get requiredVoterCount(): number {
    return this.eligibleVoters?.length ?? Infinity;
  }

  /**
   * Cast a vote.
   */
  vote(agentId: string, option: string, meta?: { reasoning?: string; confidence?: number }): boolean {
    // Validate poll is open
    if (!this.isOpen) {
      return false;
    }

    // Validate voter eligibility
    if (this.eligibleVoters && !this.eligibleVoters.includes(agentId)) {
      return false;
    }

    // Validate option
    if (!this.options.includes(option)) {
      return false;
    }

    // Check if already voted
    if (this._votes.has(agentId) && !this.allowChangeVote) {
      return false;
    }

    const vote: Vote = {
      agentId,
      option,
      timestamp: new Date(),
      reasoning: meta?.reasoning,
      confidence: meta?.confidence,
    };

    this._votes.set(agentId, vote);
    this.emit('vote', vote);

    // Check if decision reached
    this.checkDecision();

    return true;
  }

  /**
   * Get the vote for a specific agent.
   */
  getVote(agentId: string): Vote | undefined {
    return this._votes.get(agentId);
  }

  /**
   * Get the current tally.
   */
  getTally(): Record<string, number> {
    const tally: Record<string, number> = {};
    for (const option of this.options) {
      tally[option] = 0;
    }
    for (const vote of this._votes.values()) {
      tally[vote.option] = (tally[vote.option] ?? 0) + 1;
    }
    return tally;
  }

  /**
   * Get the result.
   */
  getResult(): PollResult {
    const tally = this.getTally();
    const totalVotes = this._votes.size;
    
    const percentages: Record<string, number> = {};
    for (const [option, count] of Object.entries(tally)) {
      percentages[option] = totalVotes > 0 ? count / totalVotes : 0;
    }

    // Find winner
    let winner: string | undefined;
    let maxVotes = 0;
    for (const [option, count] of Object.entries(tally)) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = option;
      }
    }

    return {
      winner,
      votes: tally,
      percentages,
      totalVotes,
      isDecided: this.isDecided,
      decidedAt: this._decidedAt,
    };
  }

  /**
   * Check if decision has been reached.
   */
  private checkDecision(): void {
    if (this._status !== PollStatus.OPEN) return;

    const result = this.getResult();
    const totalEligible = this.eligibleVoters?.length ?? this._votes.size;
    let decided = false;

    switch (this.requirement) {
      case VoteRequirement.ANY:
        decided = this._votes.size >= 1;
        break;

      case VoteRequirement.UNANIMOUS:
        if (this.eligibleVoters && this._votes.size === this.eligibleVoters.length) {
          // All eligible voters have voted
          const firstVote = this.votes[0]?.option;
          decided = this.votes.every((v) => v.option === firstVote);
        }
        break;

      case VoteRequirement.MAJORITY:
        if (result.winner) {
          const winnerPct = result.percentages[result.winner];
          decided = winnerPct > 0.5 && this._votes.size >= totalEligible / 2;
        }
        break;

      case VoteRequirement.PLURALITY:
        // Plurality is decided when all have voted or poll closes
        decided = this.eligibleVoters !== undefined && 
                  this._votes.size === this.eligibleVoters.length;
        break;

      case VoteRequirement.THRESHOLD:
        if (result.winner) {
          decided = result.percentages[result.winner] >= this.threshold;
        }
        break;
    }

    if (decided) {
      this._status = PollStatus.DECIDED;
      this._decidedAt = new Date();
      this.emit('decided', result);
    }
  }

  /**
   * Manually close the poll.
   */
  close(): PollResult {
    if (this._status === PollStatus.OPEN) {
      this._status = PollStatus.CLOSED;
      this.emit('closed');
    }
    return this.getResult();
  }

  /**
   * Cancel the poll.
   */
  cancel(): void {
    this._status = PollStatus.CANCELLED;
  }

  toJSON() {
    return {
      id: this.id,
      question: this.question,
      options: this.options,
      status: this.status,
      requirement: this.requirement,
      threshold: this.threshold,
      votes: this.anonymous ? undefined : this.votes,
      voterCount: this.voterCount,
      tally: this.getTally(),
      result: this.getResult(),
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      channelId: this.channelId,
    };
  }

  toString(): string {
    const result = this.getResult();
    const statusIcon = {
      open: '🗳️',
      closed: '📊',
      decided: '✅',
      expired: '⏰',
      cancelled: '❌',
    }[this.status];
    
    return `${statusIcon} "${this.question}" - ${result.totalVotes} votes, winner: ${result.winner ?? 'undecided'}`;
  }
}

/**
 * Manages polls in a workspace.
 */
export class PollManager {
  private readonly _polls: Map<string, Poll> = new Map();
  private readonly _byChannel: Map<string, string[]> = new Map();

  /**
   * Create a new poll.
   */
  create(config: PollConfig): Poll {
    const poll = new Poll(config);
    this._polls.set(poll.id, poll);

    if (config.channelId) {
      if (!this._byChannel.has(config.channelId)) {
        this._byChannel.set(config.channelId, []);
      }
      this._byChannel.get(config.channelId)!.push(poll.id);
    }

    return poll;
  }

  /**
   * Get a poll by ID.
   */
  get(pollId: string): Poll | undefined {
    return this._polls.get(pollId);
  }

  /**
   * Get open polls in a channel.
   */
  getOpenPolls(channelId?: string): Poll[] {
    let polls = Array.from(this._polls.values());

    if (channelId) {
      polls = polls.filter((p) => p.channelId === channelId);
    }

    return polls.filter((p) => p.isOpen);
  }

  /**
   * Get polls an agent can vote on.
   */
  getPollsForAgent(agentId: string): Poll[] {
    return Array.from(this._polls.values()).filter((p) => {
      if (!p.isOpen) return false;
      if (p.eligibleVoters && !p.eligibleVoters.includes(agentId)) return false;
      if (p.getVote(agentId) && !p.allowChangeVote) return false;
      return true;
    });
  }
}
