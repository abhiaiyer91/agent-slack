/**
 * Discord Channel — real implementation with discord.js.
 *
 * Handles:
 *   - DMs: any user who DMs the bot gets a response
 *   - @mentions in servers: responds in-thread
 *   - Thread continuity: each Discord thread maps to a Mastra memory thread
 *   - Long responses: auto-splits messages over 2000 chars
 *   - Typing indicator while Jarvis thinks
 *
 * Setup:
 *   1. Create app at https://discord.com/developers/applications
 *   2. Create a bot, get the token
 *   3. Enable MESSAGE CONTENT intent (Bot → Privileged Gateway Intents)
 *   4. Invite to server with: applications.commands, bot (Send Messages, Read Message History, Use Slash Commands)
 *   5. Set DISCORD_BOT_TOKEN in .env
 */

import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import type { Mastra } from "@mastra/core/mastra";
import type { Channel, InboundMessage, OutboundMessage } from "./channels.js";

const MAX_DISCORD_LENGTH = 1950; // Leave room for formatting

function splitMessage(text: string): string[] {
  if (text.length <= MAX_DISCORD_LENGTH) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_DISCORD_LENGTH) {
      chunks.push(remaining);
      break;
    }
    // Try to split at a newline near the limit
    let splitAt = remaining.lastIndexOf("\n", MAX_DISCORD_LENGTH);
    if (splitAt < MAX_DISCORD_LENGTH / 2) {
      // No good newline, split at space
      splitAt = remaining.lastIndexOf(" ", MAX_DISCORD_LENGTH);
    }
    if (splitAt < MAX_DISCORD_LENGTH / 2) {
      // No good space, hard split
      splitAt = MAX_DISCORD_LENGTH;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}

export class DiscordChannel implements Channel {
  id = "discord";
  name = "Discord";

  private client: Client | null = null;
  private mastra: Mastra;
  private connected = false;
  private botUserId: string | null = null;

  constructor(mastra: Mastra) {
    this.mastra = mastra;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async send(message: OutboundMessage): Promise<void> {
    if (!this.client) throw new Error("Discord not connected");
    const channel = await this.client.channels.fetch(message.recipientId);
    if (!channel || !("send" in channel)) throw new Error("Cannot send to this channel");
    const chunks = splitMessage(message.text || "");
    for (const chunk of chunks) {
      await (channel as any).send(chunk);
    }
  }

  async listen(handler: (message: InboundMessage) => Promise<void>): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      console.log("[Jarvis Discord] Missing DISCORD_BOT_TOKEN — skipped");
      return;
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    const agent = this.mastra.getAgent("jarvis");

    this.client.on(Events.MessageCreate, async (message) => {
      // Never respond to bots (including self)
      if (message.author.bot) return;

      const isDM = !message.guild;
      const isMention = message.mentions.has(this.client!.user!);

      // Only respond to DMs or @mentions
      if (!isDM && !isMention) return;

      // Strip the mention from the text
      let text = message.content;
      if (isMention && this.botUserId) {
        text = text.replace(new RegExp(`<@!?${this.botUserId}>`, "g"), "").trim();
      }

      if (!text) {
        await message.reply("Yes? How can I help?");
        return;
      }

      // Forward to handler
      await handler({
        channelId: "discord",
        senderId: message.author.id,
        senderName: message.author.displayName || message.author.username,
        threadId: message.channel.id,
        text,
        timestamp: message.createdAt.toISOString(),
      });

      // Show typing while Jarvis thinks
      await message.channel.sendTyping();

      try {
        const threadKey = isDM
          ? `discord-dm-${message.author.id}`
          : `discord-${message.channel.id}`;

        const result = await agent.generate(text, {
          memory: {
            thread: { id: threadKey },
            resource: `discord-${message.author.id}`,
          },
        });

        const responseText = result.text || "I processed your request but have no text response.";
        const chunks = splitMessage(responseText);

        // Reply to the first chunk, send the rest as follow-ups
        await message.reply(chunks[0]);
        for (let i = 1; i < chunks.length; i++) {
          await message.channel.send(chunks[i]);
        }

        // Show tool usage
        const toolResults = (result as any).toolResults;
        if (toolResults && Array.isArray(toolResults) && toolResults.length > 0) {
          const toolSummary = toolResults
            .map((tr: any) => `\`${tr.toolName}\``)
            .join(", ");
          await message.channel.send(`-# Used: ${toolSummary}`);
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await message.reply(`I encountered an error: ${error}`);
      }
    });

    this.client.once(Events.ClientReady, (c) => {
      this.botUserId = c.user.id;
      this.connected = true;
      console.log(`[Jarvis Discord] Connected as ${c.user.tag}`);
    });

    await this.client.login(token);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.destroy();
    }
    this.connected = false;
    this.client = null;
    console.log("[Jarvis Discord] Disconnected");
  }
}

/**
 * Start the Discord bot if credentials are available.
 */
export async function startDiscordBot(mastra: Mastra): Promise<DiscordChannel | null> {
  if (!process.env.DISCORD_BOT_TOKEN) {
    return null;
  }

  const channel = new DiscordChannel(mastra);
  await channel.listen(async (message) => {
    console.log(`[Jarvis Discord] ${message.senderName || message.senderId}: ${message.text?.slice(0, 80)}`);
  });

  return channel;
}
