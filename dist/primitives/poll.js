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
    UNANIMOUS: 'unanimous', // All must agree
    MAJORITY: 'majority', // > 50% must agree
    PLURALITY: 'plurality', // Most votes wins
    ANY: 'any', // First vote decides
    THRESHOLD: 'threshold', // Custom threshold
};
/**
 * Poll status.
 */
export const PollStatus = {
    OPEN: 'open',
    CLOSED: 'closed',
    DECIDED: 'decided',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
};
/**
 * A poll for agent voting.
 */
export class Poll extends EventEmitter {
    id;
    question;
    options;
    eligibleVoters;
    requirement;
    threshold;
    expiresAt;
    allowChangeVote;
    anonymous;
    channelId;
    messageId;
    createdAt;
    _status = PollStatus.OPEN;
    _votes = new Map();
    _decidedAt;
    constructor(config) {
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
    get status() {
        // Check expiration
        if (this._status === PollStatus.OPEN && this.expiresAt && new Date() > this.expiresAt) {
            this._status = PollStatus.EXPIRED;
            this.emit('expired');
        }
        return this._status;
    }
    get isOpen() {
        return this.status === PollStatus.OPEN;
    }
    get isDecided() {
        return this._status === PollStatus.DECIDED;
    }
    get votes() {
        return Array.from(this._votes.values());
    }
    get voterCount() {
        return this._votes.size;
    }
    get requiredVoterCount() {
        return this.eligibleVoters?.length ?? Infinity;
    }
    /**
     * Cast a vote.
     */
    vote(agentId, option, meta) {
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
        const vote = {
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
    getVote(agentId) {
        return this._votes.get(agentId);
    }
    /**
     * Get the current tally.
     */
    getTally() {
        const tally = {};
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
    getResult() {
        const tally = this.getTally();
        const totalVotes = this._votes.size;
        const percentages = {};
        for (const [option, count] of Object.entries(tally)) {
            percentages[option] = totalVotes > 0 ? count / totalVotes : 0;
        }
        // Find winner
        let winner;
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
    checkDecision() {
        if (this._status !== PollStatus.OPEN)
            return;
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
    close() {
        if (this._status === PollStatus.OPEN) {
            this._status = PollStatus.CLOSED;
            this.emit('closed');
        }
        return this.getResult();
    }
    /**
     * Cancel the poll.
     */
    cancel() {
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
    toString() {
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
    _polls = new Map();
    _byChannel = new Map();
    /**
     * Create a new poll.
     */
    create(config) {
        const poll = new Poll(config);
        this._polls.set(poll.id, poll);
        if (config.channelId) {
            if (!this._byChannel.has(config.channelId)) {
                this._byChannel.set(config.channelId, []);
            }
            this._byChannel.get(config.channelId).push(poll.id);
        }
        return poll;
    }
    /**
     * Get a poll by ID.
     */
    get(pollId) {
        return this._polls.get(pollId);
    }
    /**
     * Get open polls in a channel.
     */
    getOpenPolls(channelId) {
        let polls = Array.from(this._polls.values());
        if (channelId) {
            polls = polls.filter((p) => p.channelId === channelId);
        }
        return polls.filter((p) => p.isOpen);
    }
    /**
     * Get polls an agent can vote on.
     */
    getPollsForAgent(agentId) {
        return Array.from(this._polls.values()).filter((p) => {
            if (!p.isOpen)
                return false;
            if (p.eligibleVoters && !p.eligibleVoters.includes(agentId))
                return false;
            if (p.getVote(agentId) && !p.allowChangeVote)
                return false;
            return true;
        });
    }
}
//# sourceMappingURL=poll.js.map