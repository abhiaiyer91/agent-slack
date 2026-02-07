/**
 * Daily Briefing Workflow
 *
 * A multi-step workflow that gathers information from multiple sources
 * and compiles a morning briefing for the user.
 *
 * Mastra workflows use a graph-based execution engine with intuitive
 * control flow: .then(), .branch(), .parallel(). This is far cleaner
 * than OpenClaw's cron-based approach.
 *
 * Steps:
 *   1. Gather weather data
 *   2. Check calendar/schedule (placeholder)
 *   3. Scan news headlines
 *   4. Compile into briefing
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Shared input schema — all parallel steps receive the workflow input
const workflowInputSchema = z.object({
  location: z.string().default("New York, NY"),
});

// Shared output schemas — reused for both output and compile input
const eventSchema = z.object({
  time: z.string(),
  title: z.string(),
  location: z.string().optional(),
});

const headlineSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string().optional(),
});

const weatherOutputSchema = z.object({
  weather: z.string(),
  temperature: z.string(),
  conditions: z.string(),
});

const scheduleOutputSchema = z.object({
  events: z.array(eventSchema),
  summary: z.string(),
});

const newsOutputSchema = z.object({
  headlines: z.array(headlineSchema),
  summary: z.string(),
});

// ---------------------------------------------------------------------------
// Step 1: Gather weather
// ---------------------------------------------------------------------------
const gatherWeatherStep = createStep({
  id: "gather-weather",
  description: "Fetch current weather for the user's location",
  inputSchema: workflowInputSchema,
  outputSchema: weatherOutputSchema,
  execute: async ({ inputData }) => {
    return {
      weather: `Weather for ${inputData.location}: Conditions data pending.`,
      temperature: "N/A",
      conditions: "Connect weather API in daily-briefing.ts",
    };
  },
});

// ---------------------------------------------------------------------------
// Step 2: Check schedule
// ---------------------------------------------------------------------------
const checkScheduleStep = createStep({
  id: "check-schedule",
  description: "Check today's calendar and upcoming events",
  inputSchema: workflowInputSchema,
  outputSchema: scheduleOutputSchema,
  execute: async () => {
    return {
      events: [],
      summary: "Calendar integration pending. Connect via MCP or direct API.",
    };
  },
});

// ---------------------------------------------------------------------------
// Step 3: Scan news
// ---------------------------------------------------------------------------
const scanNewsStep = createStep({
  id: "scan-news",
  description: "Scan top news headlines relevant to the user",
  inputSchema: workflowInputSchema,
  outputSchema: newsOutputSchema,
  execute: async () => {
    return {
      headlines: [],
      summary: "News integration pending. Connect a news source in daily-briefing.ts.",
    };
  },
});

// ---------------------------------------------------------------------------
// Step 4: Compile briefing
// ---------------------------------------------------------------------------
const compileBriefingStep = createStep({
  id: "compile-briefing",
  description: "Compile all gathered data into a formatted briefing",
  inputSchema: z.object({
    "gather-weather": weatherOutputSchema,
    "check-schedule": scheduleOutputSchema,
    "scan-news": newsOutputSchema,
  }),
  outputSchema: z.object({
    briefing: z.string(),
    sections: z.number(),
  }),
  execute: async ({ inputData }) => {
    const weather = inputData["gather-weather"];
    const schedule = inputData["check-schedule"];
    const news = inputData["scan-news"];

    const sections = [
      `## Weather\n${weather.weather}`,
      `## Schedule\n${schedule.summary}${schedule.events.length > 0 ? "\n" + schedule.events.map((e) => `- ${e.time}: ${e.title}`).join("\n") : ""}`,
      `## News\n${news.summary}${news.headlines.length > 0 ? "\n" + news.headlines.map((h) => `- ${h.title} (${h.source})`).join("\n") : ""}`,
    ];

    return {
      briefing: `# Daily Briefing — ${new Date().toLocaleDateString()}\n\n${sections.join("\n\n")}`,
      sections: sections.length,
    };
  },
});

// ---------------------------------------------------------------------------
// Workflow: Assemble the pipeline
// ---------------------------------------------------------------------------
export const dailyBriefingWorkflow = createWorkflow({
  id: "daily-briefing",
  description: "Generate a comprehensive daily briefing with weather, schedule, and news",
  inputSchema: workflowInputSchema,
  outputSchema: z.object({
    briefing: z.string(),
    sections: z.number(),
  }),
})
  .parallel([gatherWeatherStep, checkScheduleStep, scanNewsStep])
  .then(compileBriefingStep)
  .commit();
