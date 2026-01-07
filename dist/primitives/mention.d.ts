/**
 * Mention Primitive
 *
 * Mentions (@name) are how agents direct attention to each other.
 * They're parsed from message content and trigger notifications.
 */
import { z } from 'zod';
/**
 * Types of mentions.
 */
export declare const MentionType: {
    readonly AGENT: "agent";
    readonly CHANNEL: "channel";
    readonly HERE: "here";
    readonly CHANNEL_ALL: "channel_all";
    readonly EVERYONE: "everyone";
};
export type MentionType = (typeof MentionType)[keyof typeof MentionType];
export declare const MentionSchema: z.ZodObject<{
    raw: z.ZodString;
    mentionType: z.ZodEnum<["agent", "channel", "here", "channel_all", "everyone"]>;
    targetName: z.ZodString;
    targetId: z.ZodOptional<z.ZodString>;
    startPos: z.ZodNumber;
    endPos: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    raw: string;
    mentionType: "agent" | "channel" | "here" | "channel_all" | "everyone";
    targetName: string;
    startPos: number;
    endPos: number;
    targetId?: string | undefined;
}, {
    raw: string;
    mentionType: "agent" | "channel" | "here" | "channel_all" | "everyone";
    targetName: string;
    startPos: number;
    endPos: number;
    targetId?: string | undefined;
}>;
export type MentionData = z.infer<typeof MentionSchema>;
/**
 * A mention parsed from message content.
 */
export declare class Mention {
    readonly raw: string;
    readonly mentionType: MentionType;
    readonly targetName: string;
    readonly targetId?: string;
    readonly startPos: number;
    readonly endPos: number;
    constructor(data: MentionData);
    /**
     * Check if mention was resolved to an ID.
     */
    get isResolved(): boolean;
    /**
     * Check if this is a broadcast mention (@here, @channel, @everyone).
     */
    get isBroadcast(): boolean;
    toJSON(): MentionData;
    toString(): string;
}
/**
 * Parse all mentions from message content.
 */
export declare function parseMentions(content: string, resolvers?: {
    resolveAgent?: (name: string) => string | undefined;
    resolveChannel?: (name: string) => string | undefined;
}): Mention[];
/**
 * Extract unique resolved agent IDs from mentions.
 */
export declare function getMentionedAgentIds(mentions: Mention[]): string[];
/**
 * Check if any mention is a broadcast (@here, @channel, @everyone).
 */
export declare function hasBroadcastMention(mentions: Mention[]): boolean;
/**
 * Format a mention for display.
 */
export declare function formatMention(agentName: string): string;
/**
 * Context for handling mentions in a message.
 */
export declare class MentionContext {
    readonly messageId: string;
    readonly channelId: string;
    readonly senderId: string;
    readonly mentions: Mention[];
    constructor(data: {
        messageId: string;
        channelId: string;
        senderId: string;
        mentions: Mention[];
    });
    get mentionedAgentIds(): string[];
    get hasHere(): boolean;
    get hasChannel(): boolean;
    get hasEveryone(): boolean;
    /**
     * Determine who should be notified based on mentions.
     */
    getNotificationTargets(context: {
        channelMembers: string[];
        onlineMembers: string[];
        allAgents: string[];
    }): Set<string>;
    toJSON(): {
        messageId: string;
        channelId: string;
        senderId: string;
        mentions: {
            raw: string;
            mentionType: "agent" | "channel" | "here" | "channel_all" | "everyone";
            targetName: string;
            startPos: number;
            endPos: number;
            targetId?: string | undefined;
        }[];
        mentionedAgentIds: string[];
        hasBroadcast: boolean;
    };
}
//# sourceMappingURL=mention.d.ts.map