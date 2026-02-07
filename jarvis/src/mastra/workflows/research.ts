/**
 * Research Workflow
 *
 * Sequential pipeline: decompose query → search each sub-question → synthesize report.
 * Actually calls the web search tool for each sub-question (if TAVILY_API_KEY is set).
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Schemas
const queryInputSchema = z.object({
  query: z.string().describe("The research topic or question"),
  depth: z
    .enum(["quick", "standard", "deep"])
    .describe("Research depth: quick (3 questions), standard (5), deep (8)"),
});

const decomposedSchema = z.object({
  originalQuery: z.string(),
  subQuestions: z.array(z.string()),
  estimatedTime: z.string(),
});

const findingSchema = z.object({
  question: z.string(),
  answer: z.string(),
  sources: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
});

const findingsSchema = z.object({
  findings: z.array(findingSchema),
});

const reportSchema = z.object({
  report: z.string(),
  findingsCount: z.number(),
  avgConfidence: z.string(),
});

// Step 1: Decompose
const decomposeQueryStep = createStep({
  id: "decompose-query",
  description: "Break down the research query into specific sub-questions",
  inputSchema: queryInputSchema,
  outputSchema: decomposedSchema,
  execute: async ({ inputData }) => {
    const { query, depth } = inputData;
    const questionCount = depth === "quick" ? 3 : depth === "standard" ? 5 : 8;

    // Generate diverse sub-questions from the original query
    const angles = [
      `What is ${query} and how does it work?`,
      `What are the main benefits and use cases of ${query}?`,
      `What are the limitations or criticisms of ${query}?`,
      `How does ${query} compare to its competitors or alternatives?`,
      `What is the current state and recent developments in ${query}?`,
      `Who are the key people or organizations behind ${query}?`,
      `What is the technical architecture of ${query}?`,
      `What does the future look like for ${query}?`,
    ];

    const subQuestions = angles.slice(0, questionCount);

    return {
      originalQuery: query,
      subQuestions,
      estimatedTime: `~${questionCount * 10} seconds`,
    };
  },
});

// Step 2: Research — actually calls Tavily for each sub-question
const researchSubQuestionsStep = createStep({
  id: "research-sub-questions",
  description: "Search the web for each sub-question",
  inputSchema: decomposedSchema,
  outputSchema: findingsSchema,
  execute: async ({ inputData }) => {
    const { subQuestions } = inputData;

    const findings = await Promise.all(
      subQuestions.map(async (question: string) => {
        // Try live search if Tavily is available
        if (process.env.TAVILY_API_KEY) {
          try {
            const { tavily } = await import("@tavily/core");
            const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
            const response = await client.search(question, {
              maxResults: 3,
              searchDepth: "basic",
              includeAnswer: true,
            });

            const sources = (response.results || []).map((r) => r.url);
            const answer = response.answer || response.results?.map((r) => r.content).join(" ") || "No results found.";

            return {
              question,
              answer: answer.slice(0, 500),
              sources,
              confidence: (response.answer ? "high" : "medium") as "high" | "medium" | "low",
            };
          } catch {
            // Search failed, fall through
          }
        }

        return {
          question,
          answer: `No search results available. Set TAVILY_API_KEY to enable live research.`,
          sources: [] as string[],
          confidence: "low" as const,
        };
      })
    );

    return { findings };
  },
});

// Step 3: Synthesize
const synthesizeReportStep = createStep({
  id: "synthesize-report",
  description: "Compile research findings into a comprehensive report",
  inputSchema: findingsSchema,
  outputSchema: reportSchema,
  execute: async ({ inputData }) => {
    const { findings } = inputData;

    const sections = findings.map((f) => {
      const sourcesText = f.sources.length > 0
        ? `\n*Sources: ${f.sources.join(", ")}*`
        : "";
      return `### ${f.question}\n\n${f.answer}${sourcesText}\n\n*Confidence: ${f.confidence}*`;
    });

    const confidenceCounts = { high: 0, medium: 0, low: 0 };
    for (const f of findings) {
      confidenceCounts[f.confidence]++;
    }
    const avgConfidence = confidenceCounts.high >= findings.length / 2
      ? "high"
      : confidenceCounts.low >= findings.length / 2
        ? "low"
        : "medium";

    const report = [
      `# Research Report`,
      `*Generated: ${new Date().toISOString()}*`,
      `*${findings.length} sub-questions analyzed*`,
      ``,
      `## Findings`,
      ``,
      ...sections,
      ``,
      `## Summary`,
      ``,
      `Overall confidence: **${avgConfidence}** (${confidenceCounts.high} high, ${confidenceCounts.medium} medium, ${confidenceCounts.low} low)`,
    ].join("\n");

    return {
      report,
      findingsCount: findings.length,
      avgConfidence,
    };
  },
});

// Workflow
export const researchWorkflow = createWorkflow({
  id: "research",
  description: "Conduct deep research: decompose → search → synthesize",
  inputSchema: queryInputSchema,
  outputSchema: reportSchema,
})
  .then(decomposeQueryStep)
  .then(researchSubQuestionsStep)
  .then(synthesizeReportStep)
  .commit();
