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
export const MentionType = {
  AGENT: 'agent',        // @agent-name
  CHANNEL: 'channel',    // #channel-name
  HERE: 'here',          // @here - all online agents in channel
  CHANNEL_ALL: 'channel_all', // @channel - all members of channel
  EVERYONE: 'everyone',  // @everyone - all agents in workspace
} as const;

export type MentionType = (typeof MentionType)[keyof typeof MentionType];

export const MentionSchema = z.object({
  raw: z.string(),
  mentionType: z.enum(['agent', 'channel', 'here', 'channel_all', 'everyone']),
  targetName: z.string(),
  targetId: z.string().optional(),
  startPos: z.number(),
  endPos: z.number(),
});

export type MentionData = z.infer<typeof MentionSchema>;

/**
 * A mention parsed from message content.
 */
export class Mention {
  readonly raw: string;
  readonly mentionType: MentionType;
  readonly targetName: string;
  readonly targetId?: string;
  readonly startPos: number;
  readonly endPos: number;

  constructor(data: MentionData) {
    this.raw = data.raw;
    this.mentionType = data.mentionType;
    this.targetName = data.targetName;
    this.targetId = data.targetId;
    this.startPos = data.startPos;
    this.endPos = data.endPos;
  }

  /**
   * Check if mention was resolved to an ID.
   */
  get isResolved(): boolean {
    return this.targetId !== undefined;
  }

  /**
   * Check if this is a broadcast mention (@here, @channel, @everyone).
   */
  get isBroadcast(): boolean {
    return (
      this.mentionType === MentionType.HERE ||
      this.mentionType === MentionType.CHANNEL_ALL ||
      this.mentionType === MentionType.EVERYONE
    );
  }

  toJSON(): MentionData {
    return {
      raw: this.raw,
      mentionType: this.mentionType,
      targetName: this.targetName,
      targetId: this.targetId,
      startPos: this.startPos,
      endPos: this.endPos,
    };
  }

  toString(): string {
    const resolved = this.targetId ? ` -> ${this.targetId.slice(0, 8)}` : ' (unresolved)';
    return `${this.raw}${resolved}`;
  }
}

// Regex patterns for parsing mentions
const AGENT_MENTION_PATTERN = /@([\w-]+)/g;
const CHANNEL_MENTION_PATTERN = /#([\w-]+)/g;
const BROADCAST_MENTIONS = new Set(['here', 'channel', 'everyone']);

/**
 * Parse all mentions from message content.
 */
export function parseMentions(
  content: string,
  resolvers?: {
    resolveAgent?: (name: string) => string | undefined;
    resolveChannel?: (name: string) => string | undefined;
  }
): Mention[] {
  const mentions: Mention[] = [];
  const { resolveAgent, resolveChannel } = resolvers ?? {};

  // Find @mentions
  for (const match of content.matchAll(AGENT_MENTION_PATTERN)) {
    const name = match[1].toLowerCase();

    if (BROADCAST_MENTIONS.has(name)) {
      const mentionType = {
        here: MentionType.HERE,
        channel: MentionType.CHANNEL_ALL,
        everyone: MentionType.EVERYONE,
      }[name] as MentionType;

      mentions.push(
        new Mention({
          raw: match[0],
          mentionType,
          targetName: name,
          startPos: match.index!,
          endPos: match.index! + match[0].length,
        })
      );
    } else {
      // Regular agent mention
      const targetId = resolveAgent?.(name);

      mentions.push(
        new Mention({
          raw: match[0],
          mentionType: MentionType.AGENT,
          targetName: name,
          targetId,
          startPos: match.index!,
          endPos: match.index! + match[0].length,
        })
      );
    }
  }

  // Find #channel mentions
  for (const match of content.matchAll(CHANNEL_MENTION_PATTERN)) {
    const name = match[1].toLowerCase();
    const targetId = resolveChannel?.(name);

    mentions.push(
      new Mention({
        raw: match[0],
        mentionType: MentionType.CHANNEL,
        targetName: name,
        targetId,
        startPos: match.index!,
        endPos: match.index! + match[0].length,
      })
    );
  }

  // Sort by position
  mentions.sort((a, b) => a.startPos - b.startPos);

  return mentions;
}

/**
 * Extract unique resolved agent IDs from mentions.
 */
export function getMentionedAgentIds(mentions: Mention[]): string[] {
  const ids = new Set<string>();
  for (const m of mentions) {
    if (m.mentionType === MentionType.AGENT && m.targetId) {
      ids.add(m.targetId);
    }
  }
  return Array.from(ids);
}

/**
 * Check if any mention is a broadcast (@here, @channel, @everyone).
 */
export function hasBroadcastMention(mentions: Mention[]): boolean {
  return mentions.some((m) => m.isBroadcast);
}

/**
 * Format a mention for display.
 */
export function formatMention(agentName: string): string {
  return `@${agentName}`;
}

/**
 * Context for handling mentions in a message.
 */
export class MentionContext {
  readonly messageId: string;
  readonly channelId: string;
  readonly senderId: string;
  readonly mentions: Mention[];

  constructor(data: { messageId: string; channelId: string; senderId: string; mentions: Mention[] }) {
    this.messageId = data.messageId;
    this.channelId = data.channelId;
    this.senderId = data.senderId;
    this.mentions = data.mentions;
  }

  get mentionedAgentIds(): string[] {
    return getMentionedAgentIds(this.mentions);
  }

  get hasHere(): boolean {
    return this.mentions.some((m) => m.mentionType === MentionType.HERE);
  }

  get hasChannel(): boolean {
    return this.mentions.some((m) => m.mentionType === MentionType.CHANNEL_ALL);
  }

  get hasEveryone(): boolean {
    return this.mentions.some((m) => m.mentionType === MentionType.EVERYONE);
  }

  /**
   * Determine who should be notified based on mentions.
   */
  getNotificationTargets(context: {
    channelMembers: string[];
    onlineMembers: string[];
    allAgents: string[];
  }): Set<string> {
    const targets = new Set<string>();

    // Add directly mentioned agents
    for (const id of this.mentionedAgentIds) {
      targets.add(id);
    }

    // Handle broadcast mentions
    if (this.hasEveryone) {
      for (const id of context.allAgents) {
        targets.add(id);
      }
    } else if (this.hasChannel) {
      for (const id of context.channelMembers) {
        targets.add(id);
      }
    } else if (this.hasHere) {
      for (const id of context.onlineMembers) {
        targets.add(id);
      }
    }

    // Don't notify sender
    targets.delete(this.senderId);

    return targets;
  }

  toJSON() {
    return {
      messageId: this.messageId,
      channelId: this.channelId,
      senderId: this.senderId,
      mentions: this.mentions.map((m) => m.toJSON()),
      mentionedAgentIds: this.mentionedAgentIds,
      hasBroadcast: hasBroadcastMention(this.mentions),
    };
  }
}
