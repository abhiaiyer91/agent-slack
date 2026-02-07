/**
 * Research Workflow
 *
 * A multi-step deep research workflow that:
 *   1. Breaks down a research query into sub-questions
 *   2. Searches for information on each sub-question
 *   3. Synthesizes findings into a comprehensive report
 *
 * Uses Mastra's suspend/resume for human-in-the-loop approval
 * when the research scope is large.
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Shared schemas
const queryInputSchema = z.object({
  query: z.string().describe("The research topic or question"),
  depth: z
    .enum(["quick", "standard", "deep"])
    .default("standard")
    .describe("How deep to research"),
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

// ---------------------------------------------------------------------------
// Step 1: Decompose the research query
// ---------------------------------------------------------------------------
const decomposeQueryStep = createStep({
  id: "decompose-query",
  description: "Break down the research query into specific sub-questions",
  inputSchema: queryInputSchema,
  outputSchema: decomposedSchema,
  execute: async ({ inputData }) => {
    const { query, depth } = inputData;
    const questionCount = depth === "quick" ? 3 : depth === "standard" ? 5 : 8;

    // In production, use the LLM to decompose the query intelligently.
    const subQuestions = Array.from({ length: questionCount }, (_, i) =>
      `Sub-question ${i + 1} for: "${query}"`
    );

    return {
      originalQuery: query,
      subQuestions,
      estimatedTime: `~${questionCount * 2} minutes`,
    };
  },
});

// ---------------------------------------------------------------------------
// Step 2: Research each sub-question
// ---------------------------------------------------------------------------
const researchSubQuestionsStep = createStep({
  id: "research-sub-questions",
  description: "Search and gather information for each sub-question",
  inputSchema: decomposedSchema,
  outputSchema: findingsSchema,
  execute: async ({ inputData }) => {
    const { subQuestions } = inputData;

    // In production, each sub-question would trigger web searches,
    // document analysis, and LLM synthesis.
    const findings = subQuestions.map((question: string) => ({
      question,
      answer: `Research findings pending. Connect search tools in research.ts for: "${question}"`,
      sources: [] as string[],
      confidence: "low" as const,
    }));

    return { findings };
  },
});

// ---------------------------------------------------------------------------
// Step 3: Synthesize into report
// ---------------------------------------------------------------------------
const synthesizeReportStep = createStep({
  id: "synthesize-report",
  description: "Compile research findings into a comprehensive report",
  inputSchema: findingsSchema,
  outputSchema: reportSchema,
  execute: async ({ inputData }) => {
    const { findings } = inputData;

    const sections = findings.map(
      (f: { question: string; answer: string; confidence: string }) =>
        `### ${f.question}\n\n${f.answer}\n\n*Confidence: ${f.confidence}*`
    );

    const report = [
      `# Research Report`,
      `*Generated: ${new Date().toISOString()}*`,
      ``,
      `## Findings`,
      ``,
      ...sections,
      ``,
      `## Summary`,
      ``,
      `Analyzed ${findings.length} sub-questions. Connect search providers for live data.`,
    ].join("\n");

    return {
      report,
      findingsCount: findings.length,
      avgConfidence: "pending",
    };
  },
});

// ---------------------------------------------------------------------------
// Workflow: Sequential research pipeline
// ---------------------------------------------------------------------------
export const researchWorkflow = createWorkflow({
  id: "research",
  description:
    "Conduct deep research on a topic by decomposing it into sub-questions, gathering information, and synthesizing a report",
  inputSchema: queryInputSchema,
  outputSchema: reportSchema,
})
  .then(decomposeQueryStep)
  .then(researchSubQuestionsStep)
  .then(synthesizeReportStep)
  .commit();
