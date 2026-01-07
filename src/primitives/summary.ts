/**
 * Channel Summary Primitive
 *
 * Provides summarization of channel activity for agents
 * joining conversations late or catching up after absence.
 */

import { nanoid } from 'nanoid';
import type { Message } from './message.js';
import type { Channel } from './channel.js';

/**
 * Sentiment of a conversation.
 */
export const Sentiment = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative',
  URGENT: 'urgent',
  MIXED: 'mixed',
} as const;

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
  
  // Time range
  period: {
    from: Date;
    to: Date;
    durationMinutes: number;
  };
  
  // Activity metrics
  messageCount: number;
  participantCount: number;
  threadCount: number;
  reactionCount: number;
  
  // Participants
  activeParticipants: Array<{
    agentId: string;
    messageCount: number;
    lastActive: Date;
  }>;
  
  // Content analysis
  keyTopics: string[];
  decisions: ChannelDecision[];
  openQuestions: OpenItem[];
  actionItems: OpenItem[];
  
  // Overall sentiment
  sentiment: Sentiment;
  
  // Generated text summary
  textSummary: string;
  
  // Metadata
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

const DEFAULT_CONFIG: Required<SummaryConfig> = {
  maxTopics: 5,
  includeDecisions: true,
  includeOpenItems: true,
  sentimentAnalysis: true,
  generateTextSummary: true,
};

/**
 * Extract topics from messages (simple keyword extraction).
 */
function extractTopics(messages: Message[], maxTopics: number): string[] {
  const wordFreq: Record<string, number> = {};
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until',
    'while', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'what', 'which', 'who', 'whom',
  ]);

  for (const message of messages) {
    const words = message.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    for (const word of words) {
      wordFreq[word] = (wordFreq[word] ?? 0) + 1;
    }
  }

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTopics)
    .map(([word]) => word);
}

/**
 * Detect decisions from messages (heuristic).
 */
function extractDecisions(messages: Message[]): ChannelDecision[] {
  const decisions: ChannelDecision[] = [];
  const decisionPatterns = [
    /decided to/i,
    /we('ll| will) (go with|use|implement)/i,
    /agreement:/i,
    /decision:/i,
    /approved:/i,
    /let's (go with|use|do)/i,
    /going forward,? we/i,
  ];

  for (const message of messages) {
    for (const pattern of decisionPatterns) {
      if (pattern.test(message.content)) {
        decisions.push({
          summary: message.content.slice(0, 200),
          madeBy: [message.senderId],
          messageId: message.id,
          timestamp: message.createdAt,
          status: 'agreed',
        });
        break;
      }
    }
  }

  return decisions;
}

/**
 * Detect open questions from messages.
 */
function extractOpenQuestions(messages: Message[]): OpenItem[] {
  const questions: OpenItem[] = [];
  const questionPatterns = [
    /\?$/,
    /can (someone|anyone)/i,
    /does anyone know/i,
    /what (should|do) we/i,
    /how (should|do) we/i,
  ];

  // Get last few messages more likely to have open questions
  const recentMessages = messages.slice(-20);

  for (const message of recentMessages) {
    for (const pattern of questionPatterns) {
      if (pattern.test(message.content)) {
        questions.push({
          description: message.content.slice(0, 200),
          raisedBy: message.senderId,
          messageId: message.id,
          timestamp: message.createdAt,
          priority: 'medium',
        });
        break;
      }
    }
  }

  return questions.slice(0, 5);
}

/**
 * Analyze sentiment (simple heuristic).
 */
function analyzeSentiment(messages: Message[]): Sentiment {
  let positive = 0;
  let negative = 0;
  let urgent = 0;

  const positiveWords = ['great', 'thanks', 'good', 'excellent', 'awesome', 'lgtm', 'approved', '👍', '✅', '🎉'];
  const negativeWords = ['error', 'failed', 'broken', 'issue', 'problem', 'wrong', 'bug', '❌', '👎'];
  const urgentWords = ['urgent', 'asap', 'critical', 'emergency', 'immediately', '🚨', '🔴'];

  for (const message of messages) {
    const content = message.content.toLowerCase();
    for (const word of positiveWords) {
      if (content.includes(word)) positive++;
    }
    for (const word of negativeWords) {
      if (content.includes(word)) negative++;
    }
    for (const word of urgentWords) {
      if (content.includes(word)) urgent++;
    }
  }

  if (urgent > 2) return Sentiment.URGENT;
  if (positive > negative * 2) return Sentiment.POSITIVE;
  if (negative > positive * 2) return Sentiment.NEGATIVE;
  if (positive > 0 && negative > 0) return Sentiment.MIXED;
  return Sentiment.NEUTRAL;
}

/**
 * Generate a text summary.
 */
function generateTextSummary(
  channelName: string,
  participants: string[],
  messageCount: number,
  topics: string[],
  decisions: ChannelDecision[],
  openQuestions: OpenItem[],
  sentiment: Sentiment
): string {
  const parts: string[] = [];

  parts.push(`In #${channelName}, ${participants.length} agent(s) exchanged ${messageCount} message(s).`);

  if (topics.length > 0) {
    parts.push(`Key topics discussed: ${topics.join(', ')}.`);
  }

  if (decisions.length > 0) {
    parts.push(`${decisions.length} decision(s) were made.`);
  }

  if (openQuestions.length > 0) {
    parts.push(`${openQuestions.length} question(s) remain open.`);
  }

  const sentimentDesc = {
    positive: 'The overall tone was positive.',
    negative: 'There were some concerns or issues raised.',
    neutral: 'The discussion was straightforward.',
    urgent: 'There are urgent matters requiring attention.',
    mixed: 'The discussion covered both positive and challenging topics.',
  };
  parts.push(sentimentDesc[sentiment]);

  return parts.join(' ');
}

/**
 * Generate a summary for a channel.
 */
export function generateChannelSummary(
  channel: Channel,
  messages: Message[],
  options: SummaryConfig & { generatedBy: string }
): ChannelSummary {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // Calculate time range
  const timestamps = messages.map((m) => m.createdAt.getTime());
  const from = new Date(Math.min(...timestamps));
  const to = new Date(Math.max(...timestamps));
  const durationMinutes = Math.round((to.getTime() - from.getTime()) / 60000);

  // Count participants
  const participantMap = new Map<string, { count: number; lastActive: Date }>();
  for (const message of messages) {
    const existing = participantMap.get(message.senderId);
    if (!existing || message.createdAt > existing.lastActive) {
      participantMap.set(message.senderId, {
        count: (existing?.count ?? 0) + 1,
        lastActive: message.createdAt,
      });
    } else {
      existing.count++;
    }
  }

  const activeParticipants = Array.from(participantMap.entries())
    .map(([agentId, data]) => ({
      agentId,
      messageCount: data.count,
      lastActive: data.lastActive,
    }))
    .sort((a, b) => b.messageCount - a.messageCount);

  // Count threads
  const threadIds = new Set(messages.filter((m) => m.threadId).map((m) => m.threadId));

  // Extract content
  const topics = extractTopics(messages, config.maxTopics);
  const decisions = config.includeDecisions ? extractDecisions(messages) : [];
  const openQuestions = config.includeOpenItems ? extractOpenQuestions(messages) : [];
  const sentiment = config.sentimentAnalysis ? analyzeSentiment(messages) : Sentiment.NEUTRAL;

  const textSummary = config.generateTextSummary
    ? generateTextSummary(
        channel.name,
        activeParticipants.map((p) => p.agentId),
        messages.length,
        topics,
        decisions,
        openQuestions,
        sentiment
      )
    : '';

  return {
    id: nanoid(),
    channelId: channel.id,
    channelName: channel.name,
    period: { from, to, durationMinutes },
    messageCount: messages.length,
    participantCount: activeParticipants.length,
    threadCount: threadIds.size,
    reactionCount: 0, // Would need reaction manager access
    activeParticipants,
    keyTopics: topics,
    decisions,
    openQuestions,
    actionItems: [], // Would need more sophisticated extraction
    sentiment,
    textSummary,
    generatedAt: new Date(),
    generatedBy: options.generatedBy,
  };
}

/**
 * Manages channel summaries.
 */
export class SummaryManager {
  private readonly _summaries: Map<string, ChannelSummary[]> = new Map();

  /**
   * Generate and store a summary.
   */
  generate(
    channel: Channel,
    messages: Message[],
    options: SummaryConfig & { generatedBy: string }
  ): ChannelSummary {
    const summary = generateChannelSummary(channel, messages, options);

    if (!this._summaries.has(channel.id)) {
      this._summaries.set(channel.id, []);
    }
    this._summaries.get(channel.id)!.push(summary);

    return summary;
  }

  /**
   * Get the latest summary for a channel.
   */
  getLatest(channelId: string): ChannelSummary | undefined {
    const summaries = this._summaries.get(channelId);
    return summaries?.[summaries.length - 1];
  }

  /**
   * Get all summaries for a channel.
   */
  getAll(channelId: string): ChannelSummary[] {
    return this._summaries.get(channelId) ?? [];
  }
}
