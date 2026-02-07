/**
 * Canvas / Generative UI tool for Jarvis.
 *
 * Jarvis can generate interactive visual interfaces on-the-fly using a
 * typed component model. No raw HTML injection — everything is structured
 * data rendered by the client.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Component Schema — the vocabulary Jarvis uses to describe UI
// ---------------------------------------------------------------------------
const ChartDataPoint = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
});

const CanvasComponent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("markdown"),
    title: z.string().optional(),
    content: z.string().describe("Markdown content to render"),
  }),
  z.object({
    type: z.literal("bar-chart"),
    title: z.string(),
    data: z.array(ChartDataPoint),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),
  z.object({
    type: z.literal("line-chart"),
    title: z.string(),
    data: z.array(ChartDataPoint),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),
  z.object({
    type: z.literal("metric"),
    label: z.string(),
    value: z.string(),
    change: z.string().optional().describe("e.g., '+12%' or '-3.2%'"),
    trend: z.enum(["up", "down", "flat"]).optional(),
  }),
  z.object({
    type: z.literal("table"),
    title: z.string().optional(),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
  z.object({
    type: z.literal("status-grid"),
    title: z.string().optional(),
    items: z.array(
      z.object({
        label: z.string(),
        status: z.enum(["ok", "warning", "error", "unknown"]),
        detail: z.string().optional(),
      })
    ),
  }),
  z.object({
    type: z.literal("code"),
    title: z.string().optional(),
    language: z.string().default("text"),
    code: z.string(),
  }),
  z.object({
    type: z.literal("image"),
    url: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
  }),
]);

type CanvasComponentType = z.infer<typeof CanvasComponent>;

// ---------------------------------------------------------------------------
// Canvas Tool
// ---------------------------------------------------------------------------
export const canvasTool = createTool({
  id: "canvas",
  description: `Generate an interactive visual display for the user. Use this when:
- The user asks to SEE data (charts, tables, dashboards)
- A visual would be clearer than text (comparisons, trends, status overviews)
- The user explicitly asks for a visualization

Available component types: markdown, bar-chart, line-chart, metric, table, status-grid, code, image.
You can combine multiple components in a single canvas to create dashboards.`,

  inputSchema: z.object({
    title: z.string().describe("Title for the canvas display"),
    layout: z
      .enum(["single", "grid", "dashboard"])
      .default("single")
      .describe("Layout mode"),
    components: z
      .array(CanvasComponent)
      .min(1)
      .describe("The UI components to render"),
  }),

  outputSchema: z.object({
    canvasId: z.string(),
    componentCount: z.number(),
    rendered: z.boolean(),
    summary: z.string(),
  }),

  execute: async ({ title, layout, components }) => {
    const canvasId = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[Jarvis] Canvas render: "${title}" (${layout ?? "single"}, ${components.length} components)`);

    const componentSummary = (components as CanvasComponentType[])
      .map((c) => {
        switch (c.type) {
          case "markdown":
            return `[Markdown: ${c.content.slice(0, 50)}...]`;
          case "bar-chart":
          case "line-chart":
            return `[${c.type}: "${c.title}" with ${c.data.length} points]`;
          case "metric":
            return `[Metric: ${c.label} = ${c.value}${c.change ? ` (${c.change})` : ""}]`;
          case "table":
            return `[Table: ${c.columns.length} cols, ${c.rows.length} rows]`;
          case "status-grid":
            return `[Status Grid: ${c.items.length} items]`;
          case "code":
            return `[Code: ${c.language}, ${c.code.length} chars]`;
          case "image":
            return `[Image: ${c.url}]`;
          default:
            return `[Component]`;
        }
      })
      .join(", ");

    return {
      canvasId,
      componentCount: components.length,
      rendered: true,
      summary: `Canvas "${title}" (${layout ?? "single"}): ${componentSummary}`,
    };
  },
});
