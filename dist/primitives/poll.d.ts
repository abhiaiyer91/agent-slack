/**
 * Poll Primitive
 *
 * Polls enable agents to reach consensus through voting.
 * Useful for decisions like deployments, architectural choices,
 * or prioritization.
 */
import { EventEmitter } from 'eventemitter3';
/**
 * Vote requirement strategies.
 */
export declare const VoteRequirement: {
    readonly UNANIMOUS: "unanimous";
    readonly MAJORITY: "majority";
    readonly PLURALITY: "plurality";
    readonly ANY: "any";
    readonly THRESHOLD: "threshold";
};
export type VoteRequirement = (typeof VoteRequirement)[keyof typeof VoteRequirement];
/**
 * Poll status.
 */
export declare const PollStatus: {
    readonly OPEN: "open";
    readonly CLOSED: "closed";
    readonly DECIDED: "decided";
    readonly EXPIRED: "expired";
    readonly CANCELLED: "cancelled";
};
export type PollStatus = (typeof PollStatus)[keyof typeof PollStatus];
/**
 * A single vote in a poll.
 */
export interface Vote {
    agentId: string;
    option: string;
    timestamp: Date;
    reasoning?: string;
    confidence?: number;
}
/**
 * Poll configuration.
 */
export interface PollConfig {
    question: string;
    options: string[];
    eligibleVoters?: string[];
    requirement: VoteRequirement;
    threshold?: number;
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
export declare class Poll extends EventEmitter<PollEvents> {
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
    private _status;
    private readonly _votes;
    private _decidedAt?;
    constructor(config: PollConfig);
    get status(): PollStatus;
    get isOpen(): boolean;
    get isDecided(): boolean;
    get votes(): Vote[];
    get voterCount(): number;
    get requiredVoterCount(): number;
    /**
     * Cast a vote.
     */
    vote(agentId: string, option: string, meta?: {
        reasoning?: string;
        confidence?: number;
    }): boolean;
    /**
     * Get the vote for a specific agent.
     */
    getVote(agentId: string): Vote | undefined;
    /**
     * Get the current tally.
     */
    getTally(): Record<string, number>;
    /**
     * Get the result.
     */
    getResult(): PollResult;
    /**
     * Check if decision has been reached.
     */
    private checkDecision;
    /**
     * Manually close the poll.
     */
    close(): PollResult;
    /**
     * Cancel the poll.
     */
    cancel(): void;
    toJSON(): {
        id: string;
        question: string;
        options: string[];
        status: PollStatus;
        requirement: VoteRequirement;
        threshold: number;
        votes: Vote[] | undefined;
        voterCount: number;
        tally: Record<string, number>;
        result: PollResult;
        createdAt: Date;
        expiresAt: Date | undefined;
        channelId: string | undefined;
    };
    toString(): string;
}
/**
 * Manages polls in a workspace.
 */
export declare class PollManager {
    private readonly _polls;
    private readonly _byChannel;
    /**
     * Create a new poll.
     */
    create(config: PollConfig): Poll;
    /**
     * Get a poll by ID.
     */
    get(pollId: string): Poll | undefined;
    /**
     * Get open polls in a channel.
     */
    getOpenPolls(channelId?: string): Poll[];
    /**
     * Get polls an agent can vote on.
     */
    getPollsForAgent(agentId: string): Poll[];
}
//# sourceMappingURL=poll.d.ts.map