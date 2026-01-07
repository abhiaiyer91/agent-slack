/**
 * Channel Primitive
 *
 * Channels are shared spaces for topic-based communication. They're the
 * primary way agents coordinate - everyone in a channel can see messages
 * and react.
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Message } from './message.js';

// Channel types
export const ChannelType = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  DIRECT: 'direct',
  GROUP_DM: 'group_dm',
  BROADCAST: 'broadcast',
} as const;

export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

// Channel member with permissions and state
export interface ChannelMember {
  agentId: string;
  joinedAt: Date;
  role: 'admin' | 'member' | 'guest';
  lastReadMessageId?: string;
  lastReadAt?: Date;
  notifications: 'all' | 'mentions' | 'none';
}

// Bookmark for quick references
export interface Bookmark {
  title: string;
  url: string;
  emoji: string;
}

// Zod schema for channel validation
export const ChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string().default(''),
  topic: z.string().default(''),
  channelType: z.enum(['public', 'private', 'direct', 'group_dm', 'broadcast']),
  workspaceId: z.string().optional(),
  createdAt: z.date(),
  lastActivityAt: z.date().optional(),
});

export type ChannelData = z.infer<typeof ChannelSchema>;

/**
 * A channel for agent communication.
 */
export class Channel {
  readonly id: string;
  readonly name: string;
  purpose: string;
  topic: string;
  readonly channelType: ChannelType;
  readonly workspaceId?: string;
  readonly createdAt: Date;
  lastActivityAt?: Date;

  private readonly _members: Map<string, ChannelMember> = new Map();
  private readonly _messages: Message[] = [];
  private readonly _pinnedMessageIds: Set<string> = new Set();
  private readonly _bookmarks: Bookmark[] = [];

  constructor(data: Partial<ChannelData> & { name: string }) {
    this.id = data.id ?? nanoid();
    this.name = data.name.toLowerCase().replace(/\s+/g, '-');
    this.purpose = data.purpose ?? '';
    this.topic = data.topic ?? '';
    this.channelType = data.channelType ?? ChannelType.PUBLIC;
    this.workspaceId = data.workspaceId;
    this.createdAt = data.createdAt ?? new Date();
    this.lastActivityAt = data.lastActivityAt;
  }

  get memberCount(): number {
    return this._members.size;
  }

  get members(): ChannelMember[] {
    return Array.from(this._members.values());
  }

  get memberIds(): string[] {
    return Array.from(this._members.keys());
  }

  get isDM(): boolean {
    return this.channelType === ChannelType.DIRECT || this.channelType === ChannelType.GROUP_DM;
  }

  get pinnedMessageIds(): string[] {
    return Array.from(this._pinnedMessageIds);
  }

  get bookmarks(): Bookmark[] {
    return [...this._bookmarks];
  }

  // Member management
  addMember(
    agentId: string,
    role: ChannelMember['role'] = 'member',
    notifications: ChannelMember['notifications'] = 'all'
  ): ChannelMember {
    const member: ChannelMember = {
      agentId,
      joinedAt: new Date(),
      role,
      notifications,
    };
    this._members.set(agentId, member);
    return member;
  }

  removeMember(agentId: string): boolean {
    return this._members.delete(agentId);
  }

  isMember(agentId: string): boolean {
    return this._members.has(agentId);
  }

  getMember(agentId: string): ChannelMember | undefined {
    return this._members.get(agentId);
  }

  // Message management
  postMessage(message: Message): Message {
    // Update channel reference
    const channelMessage = new Message({
      ...message.toJSON(),
      channelId: this.id,
    });

    this._messages.push(channelMessage);
    this.lastActivityAt = channelMessage.createdAt;
    return channelMessage;
  }

  getMessages(options: { limit?: number; before?: Date; after?: Date } = {}): Message[] {
    const { limit = 100, before, after } = options;

    let messages = [...this._messages];

    if (after) {
      messages = messages.filter((m) => m.createdAt > after);
    }
    if (before) {
      messages = messages.filter((m) => m.createdAt < before);
    }

    // Sort chronologically and limit
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return messages.slice(-limit);
  }

  getMessage(messageId: string): Message | undefined {
    return this._messages.find((m) => m.id === messageId);
  }

  // Pinning
  pinMessage(messageId: string): boolean {
    if (!this._pinnedMessageIds.has(messageId)) {
      this._pinnedMessageIds.add(messageId);
      return true;
    }
    return false;
  }

  unpinMessage(messageId: string): boolean {
    return this._pinnedMessageIds.delete(messageId);
  }

  // Bookmarks
  addBookmark(title: string, url: string, emoji = '🔗'): Bookmark {
    const bookmark: Bookmark = { title, url, emoji };
    this._bookmarks.push(bookmark);
    return bookmark;
  }

  // Topic management
  setTopic(topic: string): this {
    this.topic = topic;
    return this;
  }

  // Read state
  markRead(agentId: string, messageId: string): boolean {
    const member = this._members.get(agentId);
    if (member) {
      member.lastReadMessageId = messageId;
      member.lastReadAt = new Date();
      return true;
    }
    return false;
  }

  getUnreadCount(agentId: string): number {
    const member = this._members.get(agentId);
    if (!member?.lastReadAt) {
      return this._messages.length;
    }
    return this._messages.filter((m) => m.createdAt > member.lastReadAt!).length;
  }

  toJSON(): ChannelData & { memberCount: number; memberIds: string[] } {
    return {
      id: this.id,
      name: this.name,
      purpose: this.purpose,
      topic: this.topic,
      channelType: this.channelType,
      workspaceId: this.workspaceId,
      createdAt: this.createdAt,
      lastActivityAt: this.lastActivityAt,
      memberCount: this.memberCount,
      memberIds: this.memberIds,
    };
  }

  toString(): string {
    const typePrefix: Record<ChannelType, string> = {
      public: '#',
      private: '🔒',
      direct: '💬',
      group_dm: '👥',
      broadcast: '📢',
    };
    return `${typePrefix[this.channelType]}${this.name} (${this.memberCount} members)`;
  }
}

// Helper functions
export function createDMChannel(agent1Id: string, agent2Id: string): Channel {
  const channel = new Channel({
    name: `dm-${agent1Id.slice(0, 8)}-${agent2Id.slice(0, 8)}`,
    channelType: ChannelType.DIRECT,
    purpose: 'Direct message',
  });
  channel.addMember(agent1Id);
  channel.addMember(agent2Id);
  return channel;
}

export function createGroupDM(agentIds: string[], name?: string): Channel {
  const channelName = name ?? `group-${agentIds.slice(0, 3).map((a) => a.slice(0, 4)).join('-')}`;

  const channel = new Channel({
    name: channelName,
    channelType: ChannelType.GROUP_DM,
    purpose: 'Group conversation',
  });

  for (const agentId of agentIds) {
    channel.addMember(agentId);
  }

  return channel;
}
