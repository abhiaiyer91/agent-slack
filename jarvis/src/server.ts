/**
 * Jarvis HTTP Server
 *
 *   npm run serve → http://localhost:3033
 *
 * Endpoints:
 *   GET  /                    — Chat UI
 *   POST /api/chat            — Streaming chat (SSE) with memory
 *   POST /api/webhook         — External event ingestion (GitHub, Stripe, etc.)
 *   POST /api/voice/speak     — Text-to-speech (returns audio)
 *   GET  /api/canvas/:id      — Render a stored canvas as HTML
 *   GET  /api/threads          — List conversation threads
 *   GET  /api/health          — Health check
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { mastra } from "./mastra/index.js";
import { initJarvis } from "./mastra/agents/jarvis.js";
import { renderCanvas } from "./canvas/renderer.js";
import { createVoice } from "./voice/provider.js";
import { startSlackBot, type SlackChannel } from "./integrations/slack.js";
import { startDiscordBot, type DiscordChannel } from "./integrations/discord.js";
import { startTelegramBot, type TelegramChannel } from "./integrations/telegram.js";
import { Scheduler } from "./scheduler.js";
import { chatUI } from "./ui.js";

const app = new Hono();

app.use("*", cors());

// Shared state
const canvasStore = new Map<string, string>();
let slackChannel: SlackChannel | null = null;
let discordChannel: DiscordChannel | null = null;
let telegramChannel: TelegramChannel | null = null;

// ---------------------------------------------------------------------------
// GET / — Chat UI
// ---------------------------------------------------------------------------
app.get("/", (c) => c.html(chatUI()));

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------
app.get("/api/health", (c) => {
  const agent = mastra.getAgent("jarvis");
  return c.json({
    status: "ok",
    agent: agent.name,
    channels: {
      slack: slackChannel?.isConnected() || false,
      discord: discordChannel?.isConnected() || false,
      telegram: telegramChannel?.isConnected() || false,
    },
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /api/chat — Streaming chat with memory
// ---------------------------------------------------------------------------
app.post("/api/chat", async (c) => {
  const body = await c.req.json();
  const messages: Array<{ role: string; content: string }> = body.messages || [];
  const threadId: string = body.threadId || "default";
  const resourceId: string = body.resourceId || "user";
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage?.content) {
    return c.json({ error: "No message provided" }, 400);
  }

  const agent = mastra.getAgent("jarvis");

  return streamSSE(c, async (stream) => {
    try {
      const result = await agent.stream(lastMessage.content, {
        memory: {
          thread: { id: threadId },
          resource: resourceId,
        },
      });

      let fullText = "";

      for await (const chunk of result.textStream) {
        fullText += chunk;
        await stream.writeSSE({
          event: "text",
          data: JSON.stringify({ text: chunk }),
        });
      }

      const finalResult = await result;
      const toolResults = (finalResult as any).toolResults;
      if (toolResults && Array.isArray(toolResults)) {
        for (const tr of toolResults) {
          const toolCall = {
            name: tr.toolName || "unknown",
            args: tr.args || {},
            result: tr.result || null,
          };

          if (toolCall.name === "canvasTool" && toolCall.args?.components) {
            try {
              const canvasHtml = renderCanvas({
                title: toolCall.args.title || "Canvas",
                layout: toolCall.args.layout || "single",
                components: toolCall.args.components || [],
              });
              const canvasId = toolCall.result?.canvasId || `canvas-${Date.now()}`;
              canvasStore.set(canvasId, canvasHtml);
              await stream.writeSSE({
                event: "canvas",
                data: JSON.stringify({ canvasId, html: canvasHtml }),
              });
            } catch { /* Canvas render failed */ }
          }

          await stream.writeSSE({
            event: "tool",
            data: JSON.stringify(toolCall),
          });
        }
      }

      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({ text: fullText, threadId }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ error: message }),
      });
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/webhook — External event ingestion
//
// This is the glue endpoint. Any external service that can POST JSON can
// trigger Jarvis: GitHub webhooks, Stripe events, monitoring alerts, CI/CD,
// cron services, Zapier, etc.
//
// Auth: Bearer token matching JARVIS_WEBHOOK_SECRET (or no auth if not set).
//
// The agent processes the event and optionally delivers the response to
// a connected channel (Slack, Discord).
// ---------------------------------------------------------------------------
app.post("/api/webhook", async (c) => {
  // Auth check
  const secret = process.env.JARVIS_WEBHOOK_SECRET;
  if (secret) {
    const auth = c.req.header("Authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : c.req.query("token");
    if (token !== secret) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }

  const body = await c.req.json();

  // Required: message or text to process
  const message: string = body.message || body.text || "";
  if (!message) {
    return c.json({ error: "No message provided. Send { message: '...' }" }, 400);
  }

  // Optional fields
  const source: string = body.source || body.name || "webhook";
  const sessionKey: string = body.sessionKey || `webhook:${source}:${Date.now()}`;
  const deliver: boolean = body.deliver !== false;
  const channel: string = body.channel || "all"; // "slack", "discord", "all", or "none"

  const agent = mastra.getAgent("jarvis");

  try {
    // Prefix the message with the source for context
    const prompt = `[Webhook from ${source}] ${message}`;

    const result = await agent.generate(prompt, {
      memory: {
        thread: { id: sessionKey },
        resource: `webhook-${source}`,
      },
    });

    const responseText = result.text || "Processed.";

    // Deliver to channels if requested
    const deliveredTo: string[] = [];
    if (deliver && channel !== "none") {
      if ((channel === "slack" || channel === "all") && slackChannel?.isConnected()) {
        try {
          const slackTarget = body.slackChannel || process.env.JARVIS_SLACK_CHANNEL;
          if (slackTarget) {
            await slackChannel.send({
              channelId: "slack",
              recipientId: slackTarget,
              text: `*[${source}]* ${responseText}`,
            });
            deliveredTo.push("slack");
          }
        } catch { /* Slack delivery failed */ }
      }

      if ((channel === "discord" || channel === "all") && discordChannel?.isConnected()) {
        try {
          const discordTarget = body.discordChannel || process.env.JARVIS_DISCORD_CHANNEL;
          if (discordTarget) {
            await discordChannel.send({
              channelId: "discord",
              recipientId: discordTarget,
              text: `**[${source}]** ${responseText}`,
            });
            deliveredTo.push("discord");
          }
        } catch { /* Discord delivery failed */ }
      }
    }

    return c.json({
      ok: true,
      source,
      sessionKey,
      response: responseText,
      deliveredTo,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /api/canvas/:id
// ---------------------------------------------------------------------------
app.get("/api/canvas/:id", (c) => {
  const id = c.req.param("id");
  const html = canvasStore.get(id);
  if (!html) return c.text("Canvas not found", 404);
  return c.html(html);
});

// ---------------------------------------------------------------------------
// POST /api/voice/speak
// ---------------------------------------------------------------------------
app.post("/api/voice/speak", async (c) => {
  const body = await c.req.json();
  const text: string = body.text || "";
  if (!text) return c.json({ error: "No text provided" }, 400);

  try {
    const voice = await createVoice();
    if (!voice) {
      return c.json({ error: "No voice provider. Set OPENAI_API_KEY or ELEVENLABS_API_KEY." }, 503);
    }
    const audioStream = await voice.speak(text);
    if (!audioStream) return c.json({ error: "No audio returned" }, 500);

    c.header("Content-Type", "audio/mpeg");
    c.header("Cache-Control", "no-cache");
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream as NodeJS.ReadableStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return c.body(Buffer.concat(chunks));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: `TTS failed: ${message}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /api/threads — List conversation threads
// ---------------------------------------------------------------------------
app.get("/api/threads", async (c) => {
  try {
    const { storage } = await import("./mastra/agents/jarvis.js");
    // Use the generic query method to list threads
    const threads = await (storage as any).getThreads?.({ resourceId: "user" })
      ?? await (storage as any).query?.("SELECT * FROM threads WHERE resourceId = ? ORDER BY createdAt DESC LIMIT 50", ["user"])
      ?? [];
    return c.json({
      threads: Array.isArray(threads)
        ? threads.map((t: any) => ({
            id: t.id,
            title: t.title || t.id,
            createdAt: t.createdAt || t.created_at,
          }))
        : [],
    });
  } catch {
    return c.json({ threads: [] });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || "3033", 10);

async function start() {
  await initJarvis();

  // Start channels
  slackChannel = await startSlackBot(mastra);
  discordChannel = await startDiscordBot(mastra);
  telegramChannel = await startTelegramBot(mastra);

  // Start scheduler with channel delivery
  const agent = mastra.getAgent("jarvis");
  const scheduler = new Scheduler(agent);

  scheduler.add({
    id: "morning-briefing",
    cron: "0 8 * * 1-5",
    description: "Morning briefing at 8am weekdays",
    enabled: !!(slackChannel || discordChannel), // Auto-enable if a channel is connected
    task: async (a) => a.generate("Give me a daily briefing for New York. Include weather and top news."),
    deliver: async (result) => {
      const text = result?.text || "Briefing unavailable.";
      // Deliver to first available channel
      if (slackChannel?.isConnected() && process.env.JARVIS_SLACK_CHANNEL) {
        await slackChannel.send({
          channelId: "slack",
          recipientId: process.env.JARVIS_SLACK_CHANNEL,
          text: `*Morning Briefing*\n${text}`,
        });
      }
      if (discordChannel?.isConnected() && process.env.JARVIS_DISCORD_CHANNEL) {
        await discordChannel.send({
          channelId: "discord",
          recipientId: process.env.JARVIS_DISCORD_CHANNEL,
          text: `**Morning Briefing**\n${text}`,
        });
      }
    },
  });

  scheduler.start();

  serve({ fetch: app.fetch, port: PORT }, () => {
    const channels: string[] = [];
    if (slackChannel?.isConnected()) channels.push("Slack");
    if (discordChannel?.isConnected()) channels.push("Discord");
    if (telegramChannel?.isConnected()) channels.push("Telegram");

    console.log();
    console.log("  ┌─────────────────────────────────────────┐");
    console.log("  │                                         │");
    console.log("  │   J.A.R.V.I.S. Online                   │");
    console.log(`  │   http://localhost:${PORT}                  │`);
    if (channels.length > 0) {
      console.log(`  │   Channels: ${channels.join(", ").padEnd(27)}│`);
    }
    console.log(`  │   Scheduler: ${scheduler.list().filter((t) => t.enabled).length} active task(s)              │`);
    console.log(`  │   Webhook: /api/webhook                 │`);
    console.log("  │                                         │");
    console.log("  └─────────────────────────────────────────┘");
    console.log();
  });
}

start().catch((err) => {
  console.error("[Jarvis] Fatal:", err);
  process.exit(1);
});
