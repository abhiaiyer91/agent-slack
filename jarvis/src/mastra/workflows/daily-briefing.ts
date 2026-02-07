/**
 * Daily Briefing Workflow
 *
 * Parallel weather + schedule + news gathering, then compile into briefing.
 * Uses Mastra's graph-based workflow engine.
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Schemas
const workflowInputSchema = z.object({
  location: z.string().describe("Location for weather lookup"),
});

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

const briefingOutputSchema = z.object({
  briefing: z.string(),
  sections: z.number(),
});

// Step 1: Weather
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

// Step 2: Schedule
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

// Step 3: News
const scanNewsStep = createStep({
  id: "scan-news",
  description: "Scan top news headlines",
  inputSchema: workflowInputSchema,
  outputSchema: newsOutputSchema,
  execute: async () => {
    return {
      headlines: [],
      summary: "News integration pending. Connect a news source.",
    };
  },
});

// Step 4: Compile
const compileBriefingStep = createStep({
  id: "compile-briefing",
  description: "Compile all data into a formatted briefing",
  inputSchema: z.object({
    "gather-weather": weatherOutputSchema,
    "check-schedule": scheduleOutputSchema,
    "scan-news": newsOutputSchema,
  }),
  outputSchema: briefingOutputSchema,
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

// Workflow
export const dailyBriefingWorkflow = createWorkflow({
  id: "daily-briefing",
  description: "Generate a comprehensive daily briefing with weather, schedule, and news",
  inputSchema: workflowInputSchema,
  outputSchema: briefingOutputSchema,
})
  .parallel([gatherWeatherStep, checkScheduleStep, scanNewsStep])
  .then(compileBriefingStep)
  .commit();
