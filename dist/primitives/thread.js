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
export class Thread {
    id;
    parentMessageId;
    channelId;
    createdAt;
    _replies = [];
    _participantIds = new Set();
    _followerIds = new Set();
    lastReplyAt;
    constructor(data) {
        // Thread ID matches parent message ID for easy lookup
        this.id = data.parentMessageId;
        this.parentMessageId = data.parentMessageId;
        this.channelId = data.channelId;
        this.createdAt = new Date();
        // Creator is first participant
        this._participantIds.add(data.creatorId);
    }
    get replyCount() {
        return this._replies.length;
    }
    get isActive() {
        return this.replyCount > 0;
    }
    get participantIds() {
        return Array.from(this._participantIds);
    }
    get followerIds() {
        return Array.from(this._followerIds);
    }
    /**
     * Add a reply to the thread.
     */
    addReply(message) {
        const reply = new Message({
            ...message.toJSON(),
            threadId: this.id,
            channelId: this.channelId,
        });
        this._replies.push(reply);
        this.lastReplyAt = reply.createdAt;
        this._participantIds.add(reply.senderId);
        return reply;
    }
    /**
     * Get replies in the thread.
     */
    getReplies(options = {}) {
        const { limit = 100, before, after } = options;
        let replies = [...this._replies];
        if (after) {
            replies = replies.filter((r) => r.createdAt > after);
        }
        if (before) {
            replies = replies.filter((r) => r.createdAt < before);
        }
        replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return replies.slice(0, limit);
    }
    /**
     * Follow a thread for notifications.
     */
    follow(agentId) {
        if (!this._followerIds.has(agentId)) {
            this._followerIds.add(agentId);
            return true;
        }
        return false;
    }
    /**
     * Stop following a thread.
     */
    unfollow(agentId) {
        return this._followerIds.delete(agentId);
    }
    /**
     * Check if an agent should be notified of thread activity.
     */
    shouldNotify(agentId) {
        return this._participantIds.has(agentId) || this._followerIds.has(agentId);
    }
    /**
     * Get thread context for an agent catching up.
     */
    getContext() {
        return {
            threadId: this.id,
            parentMessageId: this.parentMessageId,
            channelId: this.channelId,
            replyCount: this.replyCount,
            participantCount: this._participantIds.size,
            participants: this.participantIds,
            lastReplyAt: this.lastReplyAt,
        };
    }
    toJSON() {
        return {
            id: this.id,
            parentMessageId: this.parentMessageId,
            channelId: this.channelId,
            replyCount: this.replyCount,
            participants: this.participantIds,
            followers: this.followerIds,
            createdAt: this.createdAt,
            lastReplyAt: this.lastReplyAt,
        };
    }
    toString() {
        return `Thread(${this.id.slice(0, 8)}): ${this.replyCount} replies, ${this._participantIds.size} participants`;
    }
    *[Symbol.iterator]() {
        yield* this._replies;
    }
}
/**
 * Manages threads within a channel.
 */
export class ThreadManager {
    _threads = new Map();
    _messageThreads = new Map(); // messageId -> threadId
    /**
     * Get existing thread or create new one for a message.
     */
    getOrCreateThread(parentMessage) {
        const existingThreadId = this._messageThreads.get(parentMessage.id);
        if (existingThreadId) {
            return this._threads.get(existingThreadId);
        }
        const thread = new Thread({
            parentMessageId: parentMessage.id,
            channelId: parentMessage.channelId,
            creatorId: parentMessage.senderId,
        });
        this._threads.set(thread.id, thread);
        this._messageThreads.set(parentMessage.id, thread.id);
        return thread;
    }
    /**
     * Get a thread by ID.
     */
    getThread(threadId) {
        return this._threads.get(threadId);
    }
    /**
     * Get the thread associated with a message.
     */
    getThreadForMessage(messageId) {
        const threadId = this._messageThreads.get(messageId);
        return threadId ? this._threads.get(threadId) : undefined;
    }
    /**
     * List all threads, optionally filtered.
     */
    listThreads(options = {}) {
        const { channelId, activeOnly = false } = options;
        let threads = Array.from(this._threads.values());
        if (channelId) {
            threads = threads.filter((t) => t.channelId === channelId);
        }
        if (activeOnly) {
            threads = threads.filter((t) => t.isActive);
        }
        return threads.sort((a, b) => {
            const aTime = a.lastReplyAt?.getTime() ?? a.createdAt.getTime();
            const bTime = b.lastReplyAt?.getTime() ?? b.createdAt.getTime();
            return bTime - aTime;
        });
    }
}
//# sourceMappingURL=thread.js.map