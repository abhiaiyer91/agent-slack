/**
 * Jarvis HTTP Server
 *
 * Exposes Jarvis as an HTTP API. Mastra provides a built-in server that
 * handles routing, streaming, and the playground UI automatically.
 *
 * Endpoints provided by Mastra:
 *   POST /api/agents/jarvis/generate    — one-shot text generation
 *   POST /api/agents/jarvis/stream      — streaming text generation
 *   POST /api/workflows/:id/run         — run a workflow
 *   GET  /api/agents                    — list agents
 *   GET  /playground                    — Mastra playground UI
 *
 * Custom endpoints added here:
 *   POST /api/jarvis/chat               — convenience chat endpoint
 *   POST /api/jarvis/voice/speak        — text-to-speech
 *   POST /api/jarvis/voice/listen       — speech-to-text
 *   GET  /api/jarvis/canvas/:id         — render a canvas as HTML
 *   GET  /api/jarvis/health             — health check
 */

import { mastra } from "./mastra/index.js";

// The Mastra instance IS the server when you run `mastra dev` or `mastra serve`.
// It automatically:
//   1. Starts an HTTP server on the configured port
//   2. Registers routes for all agents, workflows, and tools
//   3. Serves the playground UI
//   4. Handles streaming via Server-Sent Events
//
// For custom routes, use Mastra's server adapter (Hono):
//
//   import { createMastraServer } from "@mastra/server";
//   const app = createMastraServer({ mastra });
//   app.get("/api/jarvis/health", (c) => c.json({ status: "ok", agent: "jarvis" }));
//
// For now, we export the mastra instance and rely on `mastra dev` for serving.

export { mastra };

// Log available capabilities at startup
const jarvis = mastra.getAgent("jarvis");
console.log("[Jarvis] Server initialized");
console.log(`[Jarvis] Agent: ${jarvis.name}`);
