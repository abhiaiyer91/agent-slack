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
};
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
/**
 * A channel for agent communication.
 */
export class Channel {
    id;
    name;
    purpose;
    topic;
    channelType;
    workspaceId;
    createdAt;
    lastActivityAt;
    _members = new Map();
    _messages = [];
    _pinnedMessageIds = new Set();
    _bookmarks = [];
    constructor(data) {
        this.id = data.id ?? nanoid();
        this.name = data.name.toLowerCase().replace(/\s+/g, '-');
        this.purpose = data.purpose ?? '';
        this.topic = data.topic ?? '';
        this.channelType = data.channelType ?? ChannelType.PUBLIC;
        this.workspaceId = data.workspaceId;
        this.createdAt = data.createdAt ?? new Date();
        this.lastActivityAt = data.lastActivityAt;
    }
    get memberCount() {
        return this._members.size;
    }
    get members() {
        return Array.from(this._members.values());
    }
    get memberIds() {
        return Array.from(this._members.keys());
    }
    get isDM() {
        return this.channelType === ChannelType.DIRECT || this.channelType === ChannelType.GROUP_DM;
    }
    get pinnedMessageIds() {
        return Array.from(this._pinnedMessageIds);
    }
    get bookmarks() {
        return [...this._bookmarks];
    }
    // Member management
    addMember(agentId, role = 'member', notifications = 'all') {
        const member = {
            agentId,
            joinedAt: new Date(),
            role,
            notifications,
        };
        this._members.set(agentId, member);
        return member;
    }
    removeMember(agentId) {
        return this._members.delete(agentId);
    }
    isMember(agentId) {
        return this._members.has(agentId);
    }
    getMember(agentId) {
        return this._members.get(agentId);
    }
    // Message management
    postMessage(message) {
        // Update channel reference
        const channelMessage = new Message({
            ...message.toJSON(),
            channelId: this.id,
        });
        this._messages.push(channelMessage);
        this.lastActivityAt = channelMessage.createdAt;
        return channelMessage;
    }
    getMessages(options = {}) {
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
    getMessage(messageId) {
        return this._messages.find((m) => m.id === messageId);
    }
    // Pinning
    pinMessage(messageId) {
        if (!this._pinnedMessageIds.has(messageId)) {
            this._pinnedMessageIds.add(messageId);
            return true;
        }
        return false;
    }
    unpinMessage(messageId) {
        return this._pinnedMessageIds.delete(messageId);
    }
    // Bookmarks
    addBookmark(title, url, emoji = '🔗') {
        const bookmark = { title, url, emoji };
        this._bookmarks.push(bookmark);
        return bookmark;
    }
    // Topic management
    setTopic(topic) {
        this.topic = topic;
        return this;
    }
    // Read state
    markRead(agentId, messageId) {
        const member = this._members.get(agentId);
        if (member) {
            member.lastReadMessageId = messageId;
            member.lastReadAt = new Date();
            return true;
        }
        return false;
    }
    getUnreadCount(agentId) {
        const member = this._members.get(agentId);
        if (!member?.lastReadAt) {
            return this._messages.length;
        }
        return this._messages.filter((m) => m.createdAt > member.lastReadAt).length;
    }
    toJSON() {
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
    toString() {
        const typePrefix = {
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
export function createDMChannel(agent1Id, agent2Id) {
    const channel = new Channel({
        name: `dm-${agent1Id.slice(0, 8)}-${agent2Id.slice(0, 8)}`,
        channelType: ChannelType.DIRECT,
        purpose: 'Direct message',
    });
    channel.addMember(agent1Id);
    channel.addMember(agent2Id);
    return channel;
}
export function createGroupDM(agentIds, name) {
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
//# sourceMappingURL=channel.js.map