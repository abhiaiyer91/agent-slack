/**
 * Slack Channel Integration for Jarvis.
 *
 * Connects Jarvis to a Slack workspace via the Web API + Socket Mode.
 * Messages from Slack flow through the channel registry and security layer
 * before reaching the agent.
 *
 * Setup:
 *   1. Create a Slack App at https://api.slack.com/apps
 *   2. Enable Socket Mode
 *   3. Add bot scopes: chat:write, app_mentions:read, im:history, im:read, im:write
 *   4. Set SLACK_BOT_TOKEN and SLACK_APP_TOKEN in .env
 *
 * This is a reference implementation showing the Channel interface pattern.
 * The actual Slack SDK (@slack/bolt) would be used in production.
 */

import type { Channel, InboundMessage, OutboundMessage } from "./channels.js";

export class SlackChannel implements Channel {
  id = "slack";
  name = "Slack";

  private botToken: string | undefined;
  private appToken: string | undefined;
  private connected = false;
  private handler: ((message: InboundMessage) => Promise<void>) | null = null;

  constructor() {
    this.botToken = process.env.SLACK_BOT_TOKEN;
    this.appToken = process.env.SLACK_APP_TOKEN;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async send(message: OutboundMessage): Promise<void> {
    if (!this.botToken) {
      throw new Error("SLACK_BOT_TOKEN not set");
    }

    // In production, use @slack/web-api:
    //   const client = new WebClient(this.botToken);
    //   await client.chat.postMessage({
    //     channel: message.recipientId,
    //     text: message.text || "",
    //     thread_ts: message.threadId,
    //   });

    console.log(`[Jarvis Slack] Sending to ${message.recipientId}: ${message.text?.slice(0, 100)}`);
  }

  async listen(handler: (message: InboundMessage) => Promise<void>): Promise<void> {
    if (!this.botToken || !this.appToken) {
      console.log("[Jarvis Slack] Missing SLACK_BOT_TOKEN or SLACK_APP_TOKEN — Slack channel disabled");
      return;
    }

    this.handler = handler;
    this.connected = true;

    // In production, use @slack/bolt in Socket Mode:
    //
    //   const app = new App({
    //     token: this.botToken,
    //     appToken: this.appToken,
    //     socketMode: true,
    //   });
    //
    //   app.message(async ({ message, say }) => {
    //     if (message.subtype) return; // Skip bot messages, edits, etc.
    //     const inbound: InboundMessage = {
    //       channelId: "slack",
    //       senderId: message.user,
    //       threadId: message.thread_ts || message.ts,
    //       text: message.text,
    //       timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
    //     };
    //     await handler(inbound);
    //   });
    //
    //   await app.start();

    console.log("[Jarvis Slack] Channel connected (Socket Mode)");
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handler = null;
    console.log("[Jarvis Slack] Channel disconnected");
  }
}
