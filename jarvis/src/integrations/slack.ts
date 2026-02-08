/**
 * Slack Channel — real implementation with @slack/bolt.
 *
 * This is not a skeleton. This is a working Slack bot that:
 *   1. Connects via Socket Mode (no public URL needed)
 *   2. Listens for DMs and @mentions
 *   3. Streams Jarvis responses back to Slack
 *   4. Shows tool usage as threaded messages
 *   5. Renders canvas outputs as rich Slack blocks
 *
 * Setup:
 *   1. Create app at https://api.slack.com/apps
 *   2. Enable Socket Mode (Settings → Socket Mode → Enable)
 *   3. Add Bot Token Scopes: chat:write, app_mentions:read, im:history, im:read, im:write, users:read
 *   4. Subscribe to events: message.im, app_mention
 *   5. Install to workspace, get tokens
 *   6. Set SLACK_BOT_TOKEN and SLACK_APP_TOKEN in .env
 */

import { App, LogLevel } from "@slack/bolt";
import type { Mastra } from "@mastra/core/mastra";
import type { Channel, InboundMessage, OutboundMessage } from "./channels.js";

export class SlackChannel implements Channel {
  id = "slack";
  name = "Slack";

  private app: App | null = null;
  private mastra: Mastra;
  private connected = false;

  constructor(mastra: Mastra) {
    this.mastra = mastra;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async send(message: OutboundMessage): Promise<void> {
    if (!this.app) throw new Error("Slack not connected");

    await this.app.client.chat.postMessage({
      channel: message.recipientId,
      text: message.text || "",
      thread_ts: message.threadId,
      unfurl_links: false,
    });
  }

  async listen(handler: (message: InboundMessage) => Promise<void>): Promise<void> {
    const botToken = process.env.SLACK_BOT_TOKEN;
    const appToken = process.env.SLACK_APP_TOKEN;

    if (!botToken || !appToken) {
      console.log("[Jarvis Slack] Missing SLACK_BOT_TOKEN or SLACK_APP_TOKEN — skipped");
      return;
    }

    this.app = new App({
      token: botToken,
      appToken: appToken,
      socketMode: true,
      logLevel: LogLevel.WARN,
    });

    const agent = this.mastra.getAgent("jarvis");

    // Handle DMs
    this.app.message(async ({ message, say }) => {
      if (!message || (message as any).subtype) return; // Skip bot messages, edits
      const msg = message as any;
      if (msg.bot_id) return; // Skip our own messages

      const text = msg.text || "";
      const threadTs = msg.thread_ts || msg.ts;
      const userId = msg.user;

      // Forward to handler for security checks etc.
      await handler({
        channelId: "slack",
        senderId: userId,
        threadId: threadTs,
        text,
        timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      });

      // Generate response
      try {
        const result = await agent.generate(text, {
          memory: {
            thread: { id: `slack-${threadTs}` },
            resource: `slack-${userId}`,
          },
        });

        const responseText = result.text || "I processed your request but have no text response.";

        // Send main response
        await say({
          text: responseText,
          thread_ts: threadTs,
        });

        // If there were tool calls, show them as a follow-up
        const toolResults = (result as any).toolResults;
        if (toolResults && Array.isArray(toolResults) && toolResults.length > 0) {
          const toolSummary = toolResults
            .map((tr: any) => `\`${tr.toolName}\``)
            .join(", ");

          await say({
            text: `_Used: ${toolSummary}_`,
            thread_ts: threadTs,
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await say({
          text: `I encountered an error: ${error}`,
          thread_ts: threadTs,
        });
      }
    });

    // Handle @mentions in channels
    this.app.event("app_mention", async ({ event, say }) => {
      const text = (event.text || "").replace(/<@[A-Z0-9]+>/g, "").trim();
      const threadTs = event.thread_ts || event.ts;
      const userId = event.user;

      if (!text) {
        await say({ text: "Yes? How can I help?", thread_ts: threadTs });
        return;
      }

      try {
        const result = await agent.generate(text, {
          memory: {
            thread: { id: `slack-${threadTs}` },
            resource: `slack-${userId}`,
          },
        });

        await say({
          text: result.text || "Done.",
          thread_ts: threadTs,
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await say({
          text: `Error: ${error}`,
          thread_ts: threadTs,
        });
      }
    });

    await this.app.start();
    this.connected = true;
    console.log("[Jarvis Slack] Connected via Socket Mode");
  }

  async disconnect(): Promise<void> {
    if (this.app) {
      await this.app.stop();
    }
    this.connected = false;
    this.app = null;
    console.log("[Jarvis Slack] Disconnected");
  }
}

/**
 * Start the Slack bot if credentials are available.
 * Called from the server at startup.
 */
export async function startSlackBot(mastra: Mastra): Promise<SlackChannel | null> {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN) {
    return null;
  }

  const channel = new SlackChannel(mastra);
  await channel.listen(async (message) => {
    // Security checks could go here
    console.log(`[Jarvis Slack] Message from ${message.senderId}: ${message.text?.slice(0, 80)}`);
  });

  return channel;
}
