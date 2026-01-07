/**
 * Thread Primitive
 *
 * Threads enable focused sub-conversations branching off from a main message.
 * They keep channels clean while allowing deep dives on specific topics.
 */
import { Message } from './message.js';
/**
 * A thread of replies to a message.
 */
export declare class Thread {
    readonly id: string;
    readonly parentMessageId: string;
    readonly channelId: string;
    readonly createdAt: Date;
    private readonly _replies;
    private readonly _participantIds;
    private readonly _followerIds;
    lastReplyAt?: Date;
    constructor(data: {
        parentMessageId: string;
        channelId: string;
        creatorId: string;
    });
    get replyCount(): number;
    get isActive(): boolean;
    get participantIds(): string[];
    get followerIds(): string[];
    /**
     * Add a reply to the thread.
     */
    addReply(message: Message): Message;
    /**
     * Get replies in the thread.
     */
    getReplies(options?: {
        limit?: number;
        before?: Date;
        after?: Date;
    }): Message[];
    /**
     * Follow a thread for notifications.
     */
    follow(agentId: string): boolean;
    /**
     * Stop following a thread.
     */
    unfollow(agentId: string): boolean;
    /**
     * Check if an agent should be notified of thread activity.
     */
    shouldNotify(agentId: string): boolean;
    /**
     * Get thread context for an agent catching up.
     */
    getContext(): {
        threadId: string;
        parentMessageId: string;
        channelId: string;
        replyCount: number;
        participantCount: number;
        participants: string[];
        lastReplyAt: Date | undefined;
    };
    toJSON(): {
        id: string;
        parentMessageId: string;
        channelId: string;
        replyCount: number;
        participants: string[];
        followers: string[];
        createdAt: Date;
        lastReplyAt: Date | undefined;
    };
    toString(): string;
    [Symbol.iterator](): Iterator<Message>;
}
/**
 * Manages threads within a channel.
 */
export declare class ThreadManager {
    private readonly _threads;
    private readonly _messageThreads;
    /**
     * Get existing thread or create new one for a message.
     */
    getOrCreateThread(parentMessage: Message): Thread;
    /**
     * Get a thread by ID.
     */
    getThread(threadId: string): Thread | undefined;
    /**
     * Get the thread associated with a message.
     */
    getThreadForMessage(messageId: string): Thread | undefined;
    /**
     * List all threads, optionally filtered.
     */
    listThreads(options?: {
        channelId?: string;
        activeOnly?: boolean;
    }): Thread[];
}
//# sourceMappingURL=thread.d.ts.map