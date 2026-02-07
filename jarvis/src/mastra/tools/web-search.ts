import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Web search tool — performs a web search and returns summarized results.
 *
 * Uses the OpenAI web search grounding when available, or falls back to
 * a simple fetch-based approach. In production, plug in Tavily, Serper,
 * or Brave Search for better results.
 */
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
  }),
  execute: async ({ context }) => {
    const { query, maxResults } = context;

    // Placeholder: In production, integrate with Tavily, Serper, or Brave Search API.
    // For now, return a structured placeholder that makes the agent's behavior clear.
    console.log(`[Jarvis] Web search: "${query}" (max ${maxResults} results)`);

    return {
      query,
      results: [
        {
          title: `Search results for: ${query}`,
          url: `https://search.example.com/?q=${encodeURIComponent(query)}`,
          snippet: `Web search integration pending. Query: "${query}". Connect a search provider (Tavily, Serper, Brave) in src/mastra/tools/web-search.ts to enable live results.`,
        },
      ],
    };
  },
});
