/**
 * Channel Summary Primitive
 *
 * Provides summarization of channel activity for agents
 * joining conversations late or catching up after absence.
 */
import type { Message } from './message.js';
import type { Channel } from './channel.js';
/**
 * Sentiment of a conversation.
 */
export declare const Sentiment: {
    readonly POSITIVE: "positive";
    readonly NEUTRAL: "neutral";
    readonly NEGATIVE: "negative";
    readonly URGENT: "urgent";
    readonly MIXED: "mixed";
};
export type Sentiment = (typeof Sentiment)[keyof typeof Sentiment];
/**
 * A key decision made in the channel.
 */
export interface ChannelDecision {
    summary: string;
    madeBy: string[];
    messageId: string;
    timestamp: Date;
    status: 'proposed' | 'agreed' | 'implemented' | 'superseded';
}
/**
 * An open question or action item.
 */
export interface OpenItem {
    description: string;
    raisedBy: string;
    messageId: string;
    timestamp: Date;
    assignedTo?: string;
    priority: 'low' | 'medium' | 'high';
}
/**
 * Summary of channel activity.
 */
export interface ChannelSummary {
    id: string;
    channelId: string;
    channelName: string;
    period: {
        from: Date;
        to: Date;
        durationMinutes: number;
    };
    messageCount: number;
    participantCount: number;
    threadCount: number;
    reactionCount: number;
    activeParticipants: Array<{
        agentId: string;
        messageCount: number;
        lastActive: Date;
    }>;
    keyTopics: string[];
    decisions: ChannelDecision[];
    openQuestions: OpenItem[];
    actionItems: OpenItem[];
    sentiment: Sentiment;
    textSummary: string;
    generatedAt: Date;
    generatedBy: string;
}
/**
 * Configuration for summary generation.
 */
export interface SummaryConfig {
    maxTopics?: number;
    includeDecisions?: boolean;
    includeOpenItems?: boolean;
    sentimentAnalysis?: boolean;
    generateTextSummary?: boolean;
}
/**
 * Generate a summary for a channel.
 */
export declare function generateChannelSummary(channel: Channel, messages: Message[], options: SummaryConfig & {
    generatedBy: string;
}): ChannelSummary;
/**
 * Manages channel summaries.
 */
export declare class SummaryManager {
    private readonly _summaries;
    /**
     * Generate and store a summary.
     */
    generate(channel: Channel, messages: Message[], options: SummaryConfig & {
        generatedBy: string;
    }): ChannelSummary;
    /**
     * Get the latest summary for a channel.
     */
    getLatest(channelId: string): ChannelSummary | undefined;
    /**
     * Get all summaries for a channel.
     */
    getAll(channelId: string): ChannelSummary[];
}
//# sourceMappingURL=summary.d.ts.map