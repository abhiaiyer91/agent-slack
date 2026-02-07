/**
 * Mastra instance — the central hub for Jarvis.
 *
 * This is where everything comes together. The Mastra class is the
 * dependency injection container that wires up:
 *   - Agents (Jarvis)
 *   - Workflows (daily briefing, research)
 *   - Storage (LibSQL)
 *   - Logging
 *
 * Unlike OpenClaw's Gateway (a hand-rolled WebSocket server with 400+
 * files of spaghetti), Mastra gives us a clean, tested, production-ready
 * control plane out of the box.
 */

import { Mastra } from "@mastra/core/mastra";
import { ConsoleLogger } from "@mastra/core/logger";

import { jarvisAgent } from "./agents/jarvis.js";
import { dailyBriefingWorkflow } from "./workflows/daily-briefing.js";
import { researchWorkflow } from "./workflows/research.js";

export const mastra = new Mastra({
  agents: {
    jarvis: jarvisAgent,
  },
  workflows: {
    "daily-briefing": dailyBriefingWorkflow,
    research: researchWorkflow,
  },
  logger: new ConsoleLogger({
    level: "info",
  }),
});
