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
  readonly id: string;
  readonly parentMessageId: string;
  readonly channelId: string;
  readonly createdAt: Date;

  private readonly _replies: Message[] = [];
  private readonly _participantIds: Set<string> = new Set();
  private readonly _followerIds: Set<string> = new Set();

  lastReplyAt?: Date;

  constructor(data: { parentMessageId: string; channelId: string; creatorId: string }) {
    // Thread ID matches parent message ID for easy lookup
    this.id = data.parentMessageId;
    this.parentMessageId = data.parentMessageId;
    this.channelId = data.channelId;
    this.createdAt = new Date();
    // Creator is first participant
    this._participantIds.add(data.creatorId);
  }

  get replyCount(): number {
    return this._replies.length;
  }

  get isActive(): boolean {
    return this.replyCount > 0;
  }

  get participantIds(): string[] {
    return Array.from(this._participantIds);
  }

  get followerIds(): string[] {
    return Array.from(this._followerIds);
  }

  /**
   * Add a reply to the thread.
   */
  addReply(message: Message): Message {
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
  getReplies(options: { limit?: number; before?: Date; after?: Date } = {}): Message[] {
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
  follow(agentId: string): boolean {
    if (!this._followerIds.has(agentId)) {
      this._followerIds.add(agentId);
      return true;
    }
    return false;
  }

  /**
   * Stop following a thread.
   */
  unfollow(agentId: string): boolean {
    return this._followerIds.delete(agentId);
  }

  /**
   * Check if an agent should be notified of thread activity.
   */
  shouldNotify(agentId: string): boolean {
    return this._participantIds.has(agentId) || this._followerIds.has(agentId);
  }

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
  } {
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

  toString(): string {
    return `Thread(${this.id.slice(0, 8)}): ${this.replyCount} replies, ${this._participantIds.size} participants`;
  }

  *[Symbol.iterator](): Iterator<Message> {
    yield* this._replies;
  }
}

/**
 * Manages threads within a channel.
 */
export class ThreadManager {
  private readonly _threads: Map<string, Thread> = new Map();
  private readonly _messageThreads: Map<string, string> = new Map(); // messageId -> threadId

  /**
   * Get existing thread or create new one for a message.
   */
  getOrCreateThread(parentMessage: Message): Thread {
    const existingThreadId = this._messageThreads.get(parentMessage.id);
    if (existingThreadId) {
      return this._threads.get(existingThreadId)!;
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
  getThread(threadId: string): Thread | undefined {
    return this._threads.get(threadId);
  }

  /**
   * Get the thread associated with a message.
   */
  getThreadForMessage(messageId: string): Thread | undefined {
    const threadId = this._messageThreads.get(messageId);
    return threadId ? this._threads.get(threadId) : undefined;
  }

  /**
   * List all threads, optionally filtered.
   */
  listThreads(options: { channelId?: string; activeOnly?: boolean } = {}): Thread[] {
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
