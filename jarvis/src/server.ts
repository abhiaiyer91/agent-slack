/**
 * Jarvis HTTP Server
 *
 * The real form factor. One command, one URL, you're talking to Jarvis.
 *
 *   npm run serve
 *   → http://localhost:3033
 *
 * Endpoints:
 *   GET  /                — Chat UI
 *   POST /api/chat        — Streaming chat (SSE) with conversation memory
 *   GET  /api/health      — Health check
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { mastra } from "./mastra/index.js";
import { initJarvis } from "./mastra/agents/jarvis.js";
import { renderCanvas } from "./canvas/renderer.js";
import { chatUI } from "./ui.js";

const app = new Hono();

app.use("*", cors());

// ---------------------------------------------------------------------------
// GET / — Serve the chat UI
// ---------------------------------------------------------------------------
app.get("/", (c) => {
  return c.html(chatUI());
});

// ---------------------------------------------------------------------------
// GET /api/health — Health check
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
      // Use Mastra's memory-aware stream with thread + resource.
      // Memory automatically loads history, appends the new message,
      // sends full context to the LLM, and saves the response.
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

      // Collect tool results after stream completes
      const finalResult = await result;
      const toolResults = (finalResult as any).toolResults;
      if (toolResults && Array.isArray(toolResults)) {
        for (const tr of toolResults) {
          const toolCall = {
            name: tr.toolName || "unknown",
            args: tr.args || {},
            result: tr.result || null,
          };

          // Canvas rendering
          if (toolCall.name === "canvasTool" && toolCall.result?.rendered) {
            try {
              const canvasHtml = renderCanvas({
                title: toolCall.args.title || "Canvas",
                layout: toolCall.args.layout || "single",
                components: toolCall.args.components || [],
              });
              await stream.writeSSE({
                event: "canvas",
                data: JSON.stringify({
                  canvasId: toolCall.result.canvasId,
                  html: canvasHtml,
                }),
              });
            } catch {
              // Canvas render failed, skip
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
        data: JSON.stringify({
          text: fullText,
          threadId,
        }),
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
// Start — async init then listen
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || "3033", 10);

async function start() {
  // Initialize MCP tools, memory, etc.
  await initJarvis();

  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log();
    console.log("  ┌─────────────────────────────────────────┐");
    console.log("  │                                         │");
    console.log("  │   J.A.R.V.I.S. Online                   │");
    console.log(`  │   http://localhost:${PORT}                  │`);
    console.log("  │                                         │");
    console.log("  └─────────────────────────────────────────┘");
    console.log();
  });
}

start().catch((err) => {
  console.error("[Jarvis] Fatal startup error:", err);
  process.exit(1);
});
