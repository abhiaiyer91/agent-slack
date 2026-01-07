/**
 * Channel Primitive
 *
 * Channels are shared spaces for topic-based communication. They're the
 * primary way agents coordinate - everyone in a channel can see messages
 * and react.
 */
import { z } from 'zod';
import { Message } from './message.js';
export declare const ChannelType: {
    readonly PUBLIC: "public";
    readonly PRIVATE: "private";
    readonly DIRECT: "direct";
    readonly GROUP_DM: "group_dm";
    readonly BROADCAST: "broadcast";
};
export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];
export interface ChannelMember {
    agentId: string;
    joinedAt: Date;
    role: 'admin' | 'member' | 'guest';
    lastReadMessageId?: string;
    lastReadAt?: Date;
    notifications: 'all' | 'mentions' | 'none';
}
export interface Bookmark {
    title: string;
    url: string;
    emoji: string;
}
export declare const ChannelSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    purpose: z.ZodDefault<z.ZodString>;
    topic: z.ZodDefault<z.ZodString>;
    channelType: z.ZodEnum<["public", "private", "direct", "group_dm", "broadcast"]>;
    workspaceId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    lastActivityAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    name: string;
    purpose: string;
    topic: string;
    channelType: "public" | "private" | "direct" | "group_dm" | "broadcast";
    workspaceId?: string | undefined;
    lastActivityAt?: Date | undefined;
}, {
    id: string;
    createdAt: Date;
    name: string;
    channelType: "public" | "private" | "direct" | "group_dm" | "broadcast";
    purpose?: string | undefined;
    topic?: string | undefined;
    workspaceId?: string | undefined;
    lastActivityAt?: Date | undefined;
}>;
export type ChannelData = z.infer<typeof ChannelSchema>;
/**
 * A channel for agent communication.
 */
export declare class Channel {
    readonly id: string;
    readonly name: string;
    purpose: string;
    topic: string;
    readonly channelType: ChannelType;
    readonly workspaceId?: string;
    readonly createdAt: Date;
    lastActivityAt?: Date;
    private readonly _members;
    private readonly _messages;
    private readonly _pinnedMessageIds;
    private readonly _bookmarks;
    constructor(data: Partial<ChannelData> & {
        name: string;
    });
    get memberCount(): number;
    get members(): ChannelMember[];
    get memberIds(): string[];
    get isDM(): boolean;
    get pinnedMessageIds(): string[];
    get bookmarks(): Bookmark[];
    addMember(agentId: string, role?: ChannelMember['role'], notifications?: ChannelMember['notifications']): ChannelMember;
    removeMember(agentId: string): boolean;
    isMember(agentId: string): boolean;
    getMember(agentId: string): ChannelMember | undefined;
    postMessage(message: Message): Message;
    getMessages(options?: {
        limit?: number;
        before?: Date;
        after?: Date;
    }): Message[];
    getMessage(messageId: string): Message | undefined;
    pinMessage(messageId: string): boolean;
    unpinMessage(messageId: string): boolean;
    addBookmark(title: string, url: string, emoji?: string): Bookmark;
    setTopic(topic: string): this;
    markRead(agentId: string, messageId: string): boolean;
    getUnreadCount(agentId: string): number;
    toJSON(): ChannelData & {
        memberCount: number;
        memberIds: string[];
    };
    toString(): string;
}
export declare function createDMChannel(agent1Id: string, agent2Id: string): Channel;
export declare function createGroupDM(agentIds: string[], name?: string): Channel;
//# sourceMappingURL=channel.d.ts.map