/**
 * Daily Briefing Workflow
 *
 * Parallel weather + schedule + news gathering, then compile.
 * Weather step calls wttr.in (free, no API key).
 * News step calls Hacker News API (free, no API key).
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

// Step 1: Weather — calls wttr.in (free, no key)
const gatherWeatherStep = createStep({
  id: "gather-weather",
  description: "Fetch current weather from wttr.in",
  inputSchema: workflowInputSchema,
  outputSchema: weatherOutputSchema,
  execute: async ({ inputData }) => {
    try {
      const encoded = encodeURIComponent(inputData.location);
      const res = await fetch(`https://wttr.in/${encoded}?format=j1`, {
        headers: { "User-Agent": "Jarvis/1.0" },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) throw new Error(`wttr.in returned ${res.status}`);

      const data = await res.json() as any;
      const current = data.current_condition?.[0] || {};
      const tempC = current.temp_C || "?";
      const tempF = current.temp_F || "?";
      const desc = current.weatherDesc?.[0]?.value || "Unknown";
      const humidity = current.humidity || "?";
      const windMph = current.windspeedMiles || "?";

      return {
        weather: `${inputData.location}: ${desc}, ${tempC}C / ${tempF}F, humidity ${humidity}%, wind ${windMph} mph`,
        temperature: `${tempC}C / ${tempF}F`,
        conditions: desc,
      };
    } catch (err) {
      return {
        weather: `Weather for ${inputData.location}: unavailable (${err instanceof Error ? err.message : "error"})`,
        temperature: "N/A",
        conditions: "unavailable",
      };
    }
  },
});

// Step 2: Schedule — placeholder (needs calendar integration)
const checkScheduleStep = createStep({
  id: "check-schedule",
  description: "Check today's calendar",
  inputSchema: workflowInputSchema,
  outputSchema: scheduleOutputSchema,
  execute: async () => {
    return {
      events: [],
      summary: "No calendar connected. Add Google Calendar or Outlook via MCP to see events.",
    };
  },
});

// Step 3: News — calls Hacker News API (free, no key)
const scanNewsStep = createStep({
  id: "scan-news",
  description: "Fetch top stories from Hacker News",
  inputSchema: workflowInputSchema,
  outputSchema: newsOutputSchema,
  execute: async () => {
    try {
      const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HN API returned ${res.status}`);

      const ids = (await res.json() as number[]).slice(0, 5);

      const stories = await Promise.all(
        ids.map(async (id) => {
          const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            signal: AbortSignal.timeout(3000),
          });
          return storyRes.json() as Promise<any>;
        })
      );

      const headlines = stories
        .filter((s) => s && s.title)
        .map((s) => ({
          title: s.title,
          source: "Hacker News",
          url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        }));

      return {
        headlines,
        summary: `Top ${headlines.length} stories from Hacker News`,
      };
    } catch (err) {
      return {
        headlines: [],
        summary: `News unavailable: ${err instanceof Error ? err.message : "error"}`,
      };
    }
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
      `## News\n${news.summary}${news.headlines.length > 0 ? "\n" + news.headlines.map((h) => `- [${h.title}](${h.url})`).join("\n") : ""}`,
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
  description: "Generate a daily briefing with live weather and news",
  inputSchema: workflowInputSchema,
  outputSchema: briefingOutputSchema,
})
  .parallel([gatherWeatherStep, checkScheduleStep, scanNewsStep])
  .then(compileBriefingStep)
  .commit();
