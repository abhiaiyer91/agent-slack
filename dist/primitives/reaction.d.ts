/**
 * Reaction Primitive
 *
 * Reactions are quick, non-verbal responses to messages. For agents,
 * reactions are semantic signals - not just "I like this" but specific
 * meanings like "acknowledged", "working on it", "done", "error".
 */
import { z } from 'zod';
/**
 * Semantic reactions with specific meanings for agent communication.
 */
export declare const SemanticReactions: {
    readonly eyes: "👀";
    readonly thumbsup: "👍";
    readonly thumbsdown: "👎";
    readonly ok_hand: "👌";
    readonly hourglass: "⏳";
    readonly white_check_mark: "✅";
    readonly x: "❌";
    readonly warning: "⚠️";
    readonly rotating_light: "🚨";
    readonly arrow_right: "➡️";
    readonly repeat: "🔄";
    readonly question: "❓";
    readonly bulb: "💡";
    readonly fire: "🔥";
    readonly snowflake: "❄️";
    readonly star: "⭐";
    readonly heart: "❤️";
    readonly tada: "🎉";
    readonly thinking: "🤔";
    readonly rocket: "🚀";
};
export type SemanticReactionCode = keyof typeof SemanticReactions;
export declare const ReactionSchema: z.ZodObject<{
    emoji: z.ZodString;
    agentId: z.ZodString;
    messageId: z.ZodString;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    createdAt: Date;
    emoji: string;
    agentId: string;
    messageId: string;
}, {
    createdAt: Date;
    emoji: string;
    agentId: string;
    messageId: string;
}>;
export type ReactionData = z.infer<typeof ReactionSchema>;
/**
 * A reaction to a message.
 */
export declare class Reaction {
    readonly emoji: string;
    readonly agentId: string;
    readonly messageId: string;
    readonly createdAt: Date;
    constructor(data: {
        emoji: string;
        agentId: string;
        messageId: string;
    });
    /**
     * Get the actual emoji character.
     */
    get displayEmoji(): string;
    /**
     * Check if this is a semantic reaction with defined meaning.
     */
    get isSemantic(): boolean;
    toJSON(): ReactionData;
    toString(): string;
}
/**
 * Summary of all reactions on a message.
 */
export declare class ReactionSummary {
    readonly messageId: string;
    private readonly _reactions;
    constructor(messageId: string);
    get totalCount(): number;
    get uniqueEmojis(): string[];
    /**
     * Add a reaction. Returns false if agent already reacted with this emoji.
     */
    addReaction(emoji: string, agentId: string): boolean;
    /**
     * Remove a reaction. Returns false if reaction didn't exist.
     */
    removeReaction(emoji: string, agentId: string): boolean;
    /**
     * Check if a reaction exists.
     */
    hasReaction(emoji: string, agentId?: string): boolean;
    /**
     * Get all agents who reacted with a specific emoji.
     */
    getAgentsForEmoji(emoji: string): string[];
    /**
     * Get count of reactions for a specific emoji.
     */
    getCount(emoji: string): number;
    toJSON(): {
        messageId: string;
        totalCount: number;
        reactions: Record<string, {
            display: string;
            count: number;
            agents: string[];
        }>;
    };
    toString(): string;
}
/**
 * Manages reactions across messages.
 */
export declare class ReactionManager {
    private readonly _reactions;
    private readonly _history;
    /**
     * Add a reaction to a message.
     */
    addReaction(messageId: string, emoji: string, agentId: string): Reaction;
    /**
     * Remove a reaction from a message.
     */
    removeReaction(messageId: string, emoji: string, agentId: string): boolean;
    /**
     * Get all reactions for a message.
     */
    getReactions(messageId: string): ReactionSummary;
    /**
     * Get all message IDs that have a specific reaction.
     */
    getMessagesWithReaction(emoji: string): string[];
    /**
     * Get all reactions by a specific agent.
     */
    getAgentReactions(agentId: string): Reaction[];
}
export declare const acknowledge: (messageId: string, agentId: string) => Reaction;
export declare const approve: (messageId: string, agentId: string) => Reaction;
export declare const complete: (messageId: string, agentId: string) => Reaction;
export declare const workingOn: (messageId: string, agentId: string) => Reaction;
export declare const alert: (messageId: string, agentId: string) => Reaction;
//# sourceMappingURL=reaction.d.ts.map