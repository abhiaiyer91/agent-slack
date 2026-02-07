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
 *   POST /api/chat        — Streaming chat (SSE)
 *   GET  /api/health      — Health check
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { mastra } from "./mastra/index.js";
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
// POST /api/chat — Streaming chat
// ---------------------------------------------------------------------------
app.post("/api/chat", async (c) => {
  const body = await c.req.json();
  const messages: Array<{ role: string; content: string }> = body.messages || [];
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage?.content) {
    return c.json({ error: "No message provided" }, 400);
  }

  const agent = mastra.getAgent("jarvis");

  // Stream response via SSE
  return streamSSE(c, async (stream) => {
    try {
      const result = await agent.stream(lastMessage.content);

      let fullText = "";
      const toolCalls: Array<{ name: string; args: any; result: any }> = [];

      for await (const chunk of result.textStream) {
        fullText += chunk;
        await stream.writeSSE({
          event: "text",
          data: JSON.stringify({ text: chunk }),
        });
      }

      // Check for tool calls in the final result
      const finalResult = await result;
      if (finalResult.toolResults && Array.isArray(finalResult.toolResults)) {
        for (const tr of finalResult.toolResults) {
          const toolCall = {
            name: tr.toolName || "unknown",
            args: tr.args || {},
            result: tr.result || null,
          };
          toolCalls.push(toolCall);

          // If it's a canvas tool call, render the HTML
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
          toolCalls: toolCalls.length,
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
// Start
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || "3033", 10);

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
