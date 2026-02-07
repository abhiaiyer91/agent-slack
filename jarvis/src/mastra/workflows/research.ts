/**
 * Research Workflow
 *
 * Sequential pipeline: decompose query → search sub-questions → synthesize report.
 * Uses Mastra's graph-based workflow engine.
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

// Step 2: Research
const researchSubQuestionsStep = createStep({
  id: "research-sub-questions",
  description: "Search and gather information for each sub-question",
  inputSchema: decomposedSchema,
  outputSchema: findingsSchema,
  execute: async ({ inputData }) => {
    const { subQuestions } = inputData;

    const findings = subQuestions.map((question: string) => ({
      question,
      answer: `Research findings pending. Connect search tools for: "${question}"`,
      sources: [] as string[],
      confidence: "low" as const,
    }));

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

    const sections = findings.map(
      (f) => `### ${f.question}\n\n${f.answer}\n\n*Confidence: ${f.confidence}*`
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
