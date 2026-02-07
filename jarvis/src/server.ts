/**
 * Jarvis HTTP Server
 *
 *   npm run serve → http://localhost:3033
 *
 * Endpoints:
 *   GET  /                    — Chat UI
 *   POST /api/chat            — Streaming chat (SSE) with memory
 *   POST /api/voice/speak     — Text-to-speech (returns audio)
 *   GET  /api/canvas/:id      — Render a stored canvas as HTML
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
import { startSlackBot } from "./integrations/slack.js";
import { chatUI } from "./ui.js";

const app = new Hono();

app.use("*", cors());

// Canvas storage — in-memory for now, keyed by canvasId
const canvasStore = new Map<string, string>();

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
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /api/chat — Streaming chat with memory + canvas rendering
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

      // Process tool results
      const finalResult = await result;
      const toolResults = (finalResult as any).toolResults;
      if (toolResults && Array.isArray(toolResults)) {
        for (const tr of toolResults) {
          const toolCall = {
            name: tr.toolName || "unknown",
            args: tr.args || {},
            result: tr.result || null,
          };

          // Render + store canvas
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
            } catch {
              // Canvas render failed
            }
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
// GET /api/canvas/:id — Serve a rendered canvas
// ---------------------------------------------------------------------------
app.get("/api/canvas/:id", (c) => {
  const id = c.req.param("id");
  const html = canvasStore.get(id);
  if (!html) {
    return c.text("Canvas not found", 404);
  }
  return c.html(html);
});

// ---------------------------------------------------------------------------
// POST /api/voice/speak — Text-to-speech
// ---------------------------------------------------------------------------
app.post("/api/voice/speak", async (c) => {
  const body = await c.req.json();
  const text: string = body.text || "";

  if (!text) {
    return c.json({ error: "No text provided" }, 400);
  }

  try {
    const voice = await createVoice();
    if (!voice) {
      return c.json({ error: "No voice provider available. Set OPENAI_API_KEY or ELEVENLABS_API_KEY." }, 503);
    }

    const audioStream = await voice.speak(text);
    if (!audioStream) {
      return c.json({ error: "Voice provider returned no audio" }, 500);
    }

    // Convert Node stream to Response
    c.header("Content-Type", "audio/mpeg");
    c.header("Cache-Control", "no-cache");

    const readable = audioStream as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);

    return c.body(audioBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: `TTS failed: ${message}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || "3033", 10);

async function start() {
  await initJarvis();

  // Start Slack bot if configured
  const slack = await startSlackBot(mastra);
  if (slack) {
    console.log("[Jarvis] Slack bot running");
  }

  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log();
    console.log("  ┌─────────────────────────────────────────┐");
    console.log("  │                                         │");
    console.log("  │   J.A.R.V.I.S. Online                   │");
    console.log(`  │   http://localhost:${PORT}                  │`);
    if (slack) {
      console.log("  │   Slack: Connected                      │");
    }
    console.log("  │                                         │");
    console.log("  └─────────────────────────────────────────┘");
    console.log();
  });
}

start().catch((err) => {
  console.error("[Jarvis] Fatal:", err);
  process.exit(1);
});
