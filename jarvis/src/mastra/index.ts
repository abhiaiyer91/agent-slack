/**
 * Mastra instance — the central hub for Jarvis.
 */

import { Mastra } from "@mastra/core/mastra";
import { ConsoleLogger } from "@mastra/core/logger";

import { jarvisAgent, storage } from "./agents/jarvis.js";
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
  storage,
  logger: new ConsoleLogger({
    level: "info",
  }),
});
