/**
 * Channel / Integration registry for Jarvis.
 *
 * Instead of OpenClaw's monolithic channel system where every messenger
 * client is hardcoded into the core, we use Mastra's plugin architecture:
 *
 *   1. Each channel is a self-contained integration
 *   2. Channels register via a simple interface
 *   3. Messages flow through a unified pipeline
 *   4. New channels can be added without touching core code
 *
 * Supported channel patterns:
 *   - Direct: Slack, Discord, Telegram (via MCP or direct SDK)
 *   - Webhook: Any service that can POST messages
 *   - Real-time: WebSocket-based channels
 *   - Voice: Phone calls via Twilio/Telnyx (future)
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Channel Types
// ---------------------------------------------------------------------------

/** Inbound message from any channel */
export const InboundMessageSchema = z.object({
  channelId: z.string().describe("Channel identifier (e.g., 'slack', 'discord', 'telegram')"),
  senderId: z.string().describe("Unique sender identifier within the channel"),
  senderName: z.string().optional(),
  threadId: z.string().optional().describe("Thread/conversation ID for grouping"),
  text: z.string().optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(["image", "audio", "video", "file"]),
        url: z.string().optional(),
        base64: z.string().optional(),
        mimeType: z.string().optional(),
        fileName: z.string().optional(),
      })
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().default(() => new Date().toISOString()),
});

export type InboundMessage = z.infer<typeof InboundMessageSchema>;

/** Outbound message to any channel */
export const OutboundMessageSchema = z.object({
  channelId: z.string(),
  recipientId: z.string(),
  threadId: z.string().optional(),
  text: z.string().optional(),
  canvas: z.any().optional().describe("Canvas/generative UI payload"),
  audio: z
    .object({
      url: z.string().optional(),
      base64: z.string().optional(),
      mimeType: z.string().default("audio/mp3"),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type OutboundMessage = z.infer<typeof OutboundMessageSchema>;

// ---------------------------------------------------------------------------
// Channel Interface
// ---------------------------------------------------------------------------

export interface Channel {
  /** Unique channel identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Whether this channel is currently connected and operational */
  isConnected(): boolean;

  /** Send a message through this channel */
  send(message: OutboundMessage): Promise<void>;

  /** Start listening for inbound messages */
  listen(handler: (message: InboundMessage) => Promise<void>): Promise<void>;

  /** Gracefully shut down the channel */
  disconnect(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Channel Registry
// ---------------------------------------------------------------------------

export class ChannelRegistry {
  private channels = new Map<string, Channel>();

  /** Register a channel */
  register(channel: Channel): void {
    if (this.channels.has(channel.id)) {
      console.warn(`[Jarvis] Channel "${channel.id}" already registered, replacing`);
    }
    this.channels.set(channel.id, channel);
    console.log(`[Jarvis] Channel registered: ${channel.name} (${channel.id})`);
  }

  /** Get a channel by ID */
  get(id: string): Channel | undefined {
    return this.channels.get(id);
  }

  /** List all registered channels */
  list(): Channel[] {
    return Array.from(this.channels.values());
  }

  /** List connected channels */
  connected(): Channel[] {
    return this.list().filter((c) => c.isConnected());
  }

  /** Send a message through a specific channel */
  async send(channelId: string, message: Omit<OutboundMessage, "channelId">): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel "${channelId}" not found. Available: ${Array.from(this.channels.keys()).join(", ")}`);
    }
    await channel.send({ ...message, channelId });
  }

  /** Broadcast a message to all connected channels */
  async broadcast(message: Omit<OutboundMessage, "channelId" | "recipientId">): Promise<void> {
    const connected = this.connected();
    await Promise.allSettled(
      connected.map((c) =>
        c.send({
          ...message,
          channelId: c.id,
          recipientId: "*",
        })
      )
    );
  }

  /** Start all channels listening */
  async startAll(handler: (message: InboundMessage) => Promise<void>): Promise<void> {
    await Promise.all(this.list().map((c) => c.listen(handler)));
    console.log(`[Jarvis] All channels listening (${this.list().length} total)`);
  }

  /** Disconnect all channels */
  async disconnectAll(): Promise<void> {
    await Promise.allSettled(this.list().map((c) => c.disconnect()));
    this.channels.clear();
    console.log("[Jarvis] All channels disconnected");
  }
}

/** Singleton channel registry */
export const channelRegistry = new ChannelRegistry();
