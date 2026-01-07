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
export const SemanticReactions = {
    // Acknowledgment
    eyes: '👀', // Looking at it / reviewing
    thumbsup: '👍', // Acknowledged / approved
    thumbsdown: '👎', // Rejected / disapproved
    ok_hand: '👌', // Perfect / exactly right
    // Status
    hourglass: '⏳', // Working on it / in progress
    white_check_mark: '✅', // Completed / done
    x: '❌', // Failed / cancelled
    warning: '⚠️', // Warning / needs attention
    rotating_light: '🚨', // Critical / urgent
    // Workflow
    arrow_right: '➡️', // Passed to next step
    repeat: '🔄', // Needs retry / redo
    question: '❓', // Needs clarification
    bulb: '💡', // Insight / idea
    // Priority
    fire: '🔥', // High priority / hot
    snowflake: '❄️', // Low priority / cool down
    star: '⭐', // Important / featured
    // Sentiment
    heart: '❤️', // Great work / appreciation
    tada: '🎉', // Celebration / success
    thinking: '🤔', // Considering / uncertain
    rocket: '🚀', // Ship it / deploy
};
export const ReactionSchema = z.object({
    emoji: z.string(),
    agentId: z.string(),
    messageId: z.string(),
    createdAt: z.date(),
});
/**
 * A reaction to a message.
 */
export class Reaction {
    emoji;
    agentId;
    messageId;
    createdAt;
    constructor(data) {
        this.emoji = data.emoji;
        this.agentId = data.agentId;
        this.messageId = data.messageId;
        this.createdAt = new Date();
    }
    /**
     * Get the actual emoji character.
     */
    get displayEmoji() {
        return SemanticReactions[this.emoji] ?? this.emoji;
    }
    /**
     * Check if this is a semantic reaction with defined meaning.
     */
    get isSemantic() {
        return this.emoji in SemanticReactions;
    }
    toJSON() {
        return {
            emoji: this.emoji,
            agentId: this.agentId,
            messageId: this.messageId,
            createdAt: this.createdAt,
        };
    }
    toString() {
        return `${this.displayEmoji} by ${this.agentId.slice(0, 8)}`;
    }
}
/**
 * Summary of all reactions on a message.
 */
export class ReactionSummary {
    messageId;
    _reactions = new Map(); // emoji -> [agentIds]
    constructor(messageId) {
        this.messageId = messageId;
    }
    get totalCount() {
        return Array.from(this._reactions.values()).reduce((sum, agents) => sum + agents.length, 0);
    }
    get uniqueEmojis() {
        return Array.from(this._reactions.keys());
    }
    /**
     * Add a reaction. Returns false if agent already reacted with this emoji.
     */
    addReaction(emoji, agentId) {
        if (!this._reactions.has(emoji)) {
            this._reactions.set(emoji, []);
        }
        const agents = this._reactions.get(emoji);
        if (agents.includes(agentId)) {
            return false;
        }
        agents.push(agentId);
        return true;
    }
    /**
     * Remove a reaction. Returns false if reaction didn't exist.
     */
    removeReaction(emoji, agentId) {
        const agents = this._reactions.get(emoji);
        if (!agents)
            return false;
        const index = agents.indexOf(agentId);
        if (index === -1)
            return false;
        agents.splice(index, 1);
        if (agents.length === 0) {
            this._reactions.delete(emoji);
        }
        return true;
    }
    /**
     * Check if a reaction exists.
     */
    hasReaction(emoji, agentId) {
        const agents = this._reactions.get(emoji);
        if (!agents)
            return false;
        if (agentId) {
            return agents.includes(agentId);
        }
        return agents.length > 0;
    }
    /**
     * Get all agents who reacted with a specific emoji.
     */
    getAgentsForEmoji(emoji) {
        return this._reactions.get(emoji) ?? [];
    }
    /**
     * Get count of reactions for a specific emoji.
     */
    getCount(emoji) {
        return this._reactions.get(emoji)?.length ?? 0;
    }
    toJSON() {
        const reactions = {};
        for (const [emoji, agents] of this._reactions) {
            reactions[emoji] = {
                display: SemanticReactions[emoji] ?? emoji,
                count: agents.length,
                agents,
            };
        }
        return {
            messageId: this.messageId,
            totalCount: this.totalCount,
            reactions,
        };
    }
    toString() {
        const parts = [];
        for (const [emoji, agents] of this._reactions) {
            const display = SemanticReactions[emoji] ?? emoji;
            parts.push(`${display} ${agents.length}`);
        }
        return parts.join(' ') || '(no reactions)';
    }
}
/**
 * Manages reactions across messages.
 */
export class ReactionManager {
    _reactions = new Map();
    _history = [];
    /**
     * Add a reaction to a message.
     */
    addReaction(messageId, emoji, agentId) {
        if (!this._reactions.has(messageId)) {
            this._reactions.set(messageId, new ReactionSummary(messageId));
        }
        const summary = this._reactions.get(messageId);
        if (summary.addReaction(emoji, agentId)) {
            const reaction = new Reaction({ emoji, agentId, messageId });
            this._history.push(reaction);
            return reaction;
        }
        return new Reaction({ emoji, agentId, messageId });
    }
    /**
     * Remove a reaction from a message.
     */
    removeReaction(messageId, emoji, agentId) {
        const summary = this._reactions.get(messageId);
        return summary?.removeReaction(emoji, agentId) ?? false;
    }
    /**
     * Get all reactions for a message.
     */
    getReactions(messageId) {
        return this._reactions.get(messageId) ?? new ReactionSummary(messageId);
    }
    /**
     * Get all message IDs that have a specific reaction.
     */
    getMessagesWithReaction(emoji) {
        const messageIds = [];
        for (const [messageId, summary] of this._reactions) {
            if (summary.hasReaction(emoji)) {
                messageIds.push(messageId);
            }
        }
        return messageIds;
    }
    /**
     * Get all reactions by a specific agent.
     */
    getAgentReactions(agentId) {
        return this._history.filter((r) => r.agentId === agentId);
    }
}
// Helper functions for semantic reactions
export const acknowledge = (messageId, agentId) => new Reaction({ emoji: 'eyes', agentId, messageId });
export const approve = (messageId, agentId) => new Reaction({ emoji: 'thumbsup', agentId, messageId });
export const complete = (messageId, agentId) => new Reaction({ emoji: 'white_check_mark', agentId, messageId });
export const workingOn = (messageId, agentId) => new Reaction({ emoji: 'hourglass', agentId, messageId });
export const alert = (messageId, agentId) => new Reaction({ emoji: 'rotating_light', agentId, messageId });
//# sourceMappingURL=reaction.js.map