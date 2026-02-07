/**
 * Web search tool — performs a live web search via Tavily.
 *
 * Tavily is purpose-built for AI agent search: it returns clean, structured
 * results with relevant snippets. Falls back gracefully if no TAVILY_API_KEY.
 *
 * Get a free API key at https://tavily.com
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const webSearchTool = createTool({
  id: "web-search",
  description:
    "Search the web for current information. Use this when you need up-to-date facts, news, or data that may not be in your training data.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .describe("Maximum number of results to return"),
    searchDepth: z
      .enum(["basic", "advanced"])
      .default("basic")
      .describe("Search depth: 'basic' is fast, 'advanced' is more thorough"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      })
    ),
    query: z.string(),
    answer: z.string().optional(),
  }),
  execute: async ({ query, maxResults, searchDepth }) => {
    if (!process.env.TAVILY_API_KEY) {
      return {
        query,
        results: [
          {
            title: "Web search unavailable",
            url: "https://tavily.com",
            snippet:
              "Set TAVILY_API_KEY in your .env to enable live web search. Get a free key at https://tavily.com",
          },
        ],
      };
    }

    try {
      const { tavily } = await import("@tavily/core");
      const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

      const response = await client.search(query, {
        maxResults: maxResults ?? 5,
        searchDepth: searchDepth ?? "basic",
        includeAnswer: true,
      });

      const results = (response.results || []).map((r) => ({
        title: r.title || "Untitled",
        url: r.url,
        snippet: r.content || "",
      }));

      return {
        query,
        results,
        answer: response.answer || undefined,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        query,
        results: [
          {
            title: "Search failed",
            url: "",
            snippet: `Web search error: ${error}`,
          },
        ],
      };
    }
  },
});
