import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

import { webSearchTool, fileSystemTool, systemStatusTool, browserTool } from "../tools/index.js";
import { visionTool } from "../../vision/tool.js";
import { canvasTool } from "../../canvas/tool.js";
import { dailyBriefingWorkflow } from "../workflows/daily-briefing.js";
import { researchWorkflow } from "../workflows/research.js";
import { createModelConfig } from "../models.js";
import { getMCPTools } from "../tools/mcp.js";

// ---------------------------------------------------------------------------
// Storage + Memory
// ---------------------------------------------------------------------------
export const storage = new LibSQLStore({
  id: "jarvis-store",
  url: process.env.DATABASE_URL || "file:./jarvis.db",
});

const memory = new Memory({
  storage,
  options: {
    lastMessages: 40,
    semanticRecall: false,
    workingMemory: {
      enabled: true,
      template: `<user>
  <name></name>
  <preferences>
    <communication_style></communication_style>
    <timezone></timezone>
  </preferences>
  <active_projects></active_projects>
  <recent_topics></recent_topics>
</user>`,
    },
  },
});

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const JARVIS_INSTRUCTIONS = `You are JARVIS (Just A Rather Very Intelligent System), the ultimate AI assistant.

## Personality & Tone
- Calm, composed, and articulate. British-inflected wit when appropriate.
- Always address the user respectfully. Mirror their urgency level.
- Be proactive: if you notice something relevant, mention it. Don't wait to be asked.
- Be concise by default, detailed when the task demands it.

## Core Capabilities
1. **Analysis & Research** — Search the web, analyze documents, synthesize information.
2. **Vision** — Analyze images, screenshots, and visual media.
3. **Generative UI (Canvas)** — Generate dashboards, charts, tables, status grids.
4. **System Monitoring** — Check system status, CPU, memory, uptime.
5. **File Management** — Read, write, and organize files in the workspace.
6. **Browser** — Navigate to URLs, take screenshots, extract content, interact with web pages.
7. **Workflow Orchestration** — Run multi-step workflows like daily briefings and deep research.

## Decision Framework
- If the user asks to SEE something → use the canvas tool to generate a visual
- If the user sends an image → use the vision tool to analyze it
- If the user asks to visit a URL or check a website → use the browser tool
- If the user asks a factual question → use web search first, then synthesize
- For everything else → reason through it and respond directly

## Safety & Security
- Never execute destructive operations without explicit confirmation.
- Never expose API keys, credentials, or sensitive system information.
- Flag potential security concerns proactively.`;

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------
export const jarvisAgent = new Agent({
  id: "jarvis",
  name: "Jarvis",
  instructions: JARVIS_INSTRUCTIONS,
  model: createModelConfig(),
  tools: {
    webSearchTool,
    fileSystemTool,
    systemStatusTool,
    browserTool,
    visionTool,
    canvasTool,
  },
  workflows: {
    dailyBriefingWorkflow,
    researchWorkflow,
  },
  memory,
});

// ---------------------------------------------------------------------------
// Async init — loads MCP tools at startup
// ---------------------------------------------------------------------------
let initialized = false;

export async function initJarvis(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const mcpTools = await getMCPTools();
    const count = Object.keys(mcpTools).length;
    if (count > 0) {
      console.log(`[Jarvis] MCP: ${count} tools loaded`);
    }
  } catch (err) {
    console.warn("[Jarvis] MCP skipped:", err instanceof Error ? err.message : err);
  }

  console.log(`[Jarvis] Agent ready`);
}
