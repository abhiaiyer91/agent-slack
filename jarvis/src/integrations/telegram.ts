/**
 * Telegram Channel — real implementation with grammy.
 *
 * Handles:
 *   - Private messages (DMs to the bot)
 *   - Group mentions (reply-to-bot or /ask command)
 *   - Conversation memory per chat
 *   - Long message splitting (Telegram 4096 char limit)
 *   - Typing action while Jarvis thinks
 *
 * Setup:
 *   1. Message @BotFather on Telegram, create a new bot
 *   2. Copy the token
 *   3. Set TELEGRAM_BOT_TOKEN in .env
 */

import { Bot } from "grammy";
import type { Mastra } from "@mastra/core/mastra";
import type { Channel, InboundMessage, OutboundMessage } from "./channels.js";

const MAX_TG_LENGTH = 4000;

function splitMessage(text: string): string[] {
  if (text.length <= MAX_TG_LENGTH) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_TG_LENGTH) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n", MAX_TG_LENGTH);
    if (splitAt < MAX_TG_LENGTH / 2) splitAt = remaining.lastIndexOf(" ", MAX_TG_LENGTH);
    if (splitAt < MAX_TG_LENGTH / 2) splitAt = MAX_TG_LENGTH;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}

export class TelegramChannel implements Channel {
  id = "telegram";
  name = "Telegram";

  private bot: Bot | null = null;
  private mastra: Mastra;
  private connected = false;

  constructor(mastra: Mastra) {
    this.mastra = mastra;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async send(message: OutboundMessage): Promise<void> {
    if (!this.bot) throw new Error("Telegram not connected");
    const chunks = splitMessage(message.text || "");
    for (const chunk of chunks) {
      await this.bot.api.sendMessage(message.recipientId, chunk, { parse_mode: "Markdown" });
    }
  }

  async listen(handler: (message: InboundMessage) => Promise<void>): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.log("[Jarvis Telegram] Missing TELEGRAM_BOT_TOKEN — skipped");
      return;
    }

    this.bot = new Bot(token);
    const agent = this.mastra.getAgent("jarvis");

    // Handle all text messages
    this.bot.on("message:text", async (ctx) => {
      const text = ctx.message.text;
      const chatId = ctx.chat.id;
      const userId = ctx.from?.id;
      const isPrivate = ctx.chat.type === "private";
      const botUsername = ctx.me.username;

      // In groups, only respond to replies to the bot or messages that mention the bot
      if (!isPrivate) {
        const isReplyToBot = ctx.message.reply_to_message?.from?.id === ctx.me.id;
        const mentionsBot = botUsername && text.includes(`@${botUsername}`);
        if (!isReplyToBot && !mentionsBot) return;
      }

      // Strip bot mention from text
      let cleanText = text;
      if (botUsername) {
        cleanText = cleanText.replace(new RegExp(`@${botUsername}`, "gi"), "").trim();
      }

      if (!cleanText) {
        await ctx.reply("Yes? How can I help?");
        return;
      }

      // Forward to handler
      await handler({
        channelId: "telegram",
        senderId: String(userId),
        senderName: ctx.from?.first_name || ctx.from?.username,
        threadId: String(chatId),
        text: cleanText,
        timestamp: new Date(ctx.message.date * 1000).toISOString(),
      });

      // Show typing
      await ctx.replyWithChatAction("typing");

      try {
        const result = await agent.generate(cleanText, {
          memory: {
            thread: { id: `telegram-${chatId}` },
            resource: `telegram-${userId}`,
          },
        });

        const responseText = result.text || "Done.";
        const chunks = splitMessage(responseText);

        for (const chunk of chunks) {
          await ctx.reply(chunk, { reply_to_message_id: ctx.message.message_id });
        }

        // Show tool usage
        const toolResults = (result as any).toolResults;
        if (toolResults && Array.isArray(toolResults) && toolResults.length > 0) {
          const toolSummary = toolResults.map((tr: any) => tr.toolName).join(", ");
          await ctx.reply(`_Used: ${toolSummary}_`, { parse_mode: "Markdown" });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await ctx.reply(`Error: ${error}`);
      }
    });

    // Start polling
    this.bot.start({
      onStart: () => {
        this.connected = true;
        console.log(`[Jarvis Telegram] Connected as @${this.bot!.botInfo.username}`);
      },
    });
  }

  async disconnect(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
    }
    this.connected = false;
    this.bot = null;
    console.log("[Jarvis Telegram] Disconnected");
  }
}

/**
 * Start the Telegram bot if credentials are available.
 */
export async function startTelegramBot(mastra: Mastra): Promise<TelegramChannel | null> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;

  const channel = new TelegramChannel(mastra);
  await channel.listen(async (message) => {
    console.log(`[Jarvis Telegram] ${message.senderName || message.senderId}: ${message.text?.slice(0, 80)}`);
  });

  return channel;
}
