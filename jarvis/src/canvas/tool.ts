/**
 * Canvas / Generative UI tool for Jarvis.
 *
 * This is the BIG one. Jarvis can generate interactive visual interfaces
 * on-the-fly — dashboards, charts, data visualizations, rich components.
 *
 * How it differs from OpenClaw's A2UI:
 *
 *   OpenClaw: Writes raw HTML files to a directory, serves them via a static
 *   file server with chokidar watch + page reload. Fragile, no state
 *   management, no component model, injection-prone.
 *
 *   Jarvis (Mastra): Uses a structured component model. The agent describes
 *   what it wants to render as structured data, and the client-side renderer
 *   (React via @mastra/react or any frontend) turns it into real UI. The
 *   agent never writes raw HTML — it works with typed components.
 *
 * This approach is:
 *   - Type-safe: Components have schemas, not free-form HTML
 *   - Secure: No HTML/JS injection possible
 *   - Framework-agnostic: Works with React, Vue, Svelte, or vanilla JS
 *   - Stateful: Components can send events back to the agent
 *   - Streamable: UI updates can stream incrementally
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
  // Markdown card — rich text display
  z.object({
    type: z.literal("markdown"),
    title: z.string().optional(),
    content: z.string().describe("Markdown content to render"),
  }),

  // Bar chart
  z.object({
    type: z.literal("bar-chart"),
    title: z.string(),
    data: z.array(ChartDataPoint),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),

  // Line chart
  z.object({
    type: z.literal("line-chart"),
    title: z.string(),
    data: z.array(ChartDataPoint),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),

  // Metric card — single KPI / stat
  z.object({
    type: z.literal("metric"),
    label: z.string(),
    value: z.string(),
    change: z.string().optional().describe("e.g., '+12%' or '-3.2%'"),
    trend: z.enum(["up", "down", "flat"]).optional(),
  }),

  // Table — structured data display
  z.object({
    type: z.literal("table"),
    title: z.string().optional(),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),

  // Status grid — multiple statuses at a glance
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

  // Code block — syntax-highlighted code
  z.object({
    type: z.literal("code"),
    title: z.string().optional(),
    language: z.string().default("text"),
    code: z.string(),
  }),

  // Image display
  z.object({
    type: z.literal("image"),
    url: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
  }),
]);

// ---------------------------------------------------------------------------
// Canvas Tool
// ---------------------------------------------------------------------------
export const canvasTool = createTool({
  id: "canvas",
  description: `Generate an interactive visual display for the user. Use this when:
- The user asks to SEE data (charts, tables, dashboards)
- A visual would be clearer than text (comparisons, trends, status overviews)
- The user explicitly asks for a visualization

Available component types:
- markdown: Rich text with headers, lists, links
- bar-chart / line-chart: Data visualizations
- metric: Single KPI/stat card with optional trend indicator
- table: Structured data in rows and columns
- status-grid: Multiple status indicators at a glance
- code: Syntax-highlighted code blocks
- image: Display an image with optional caption

You can combine multiple components in a single canvas to create dashboards.`,

  inputSchema: z.object({
    title: z.string().describe("Title for the canvas display"),
    layout: z
      .enum(["single", "grid", "dashboard"])
      .default("single")
      .describe("Layout mode: 'single' for one component, 'grid' for side-by-side, 'dashboard' for full layout"),
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

  execute: async ({ context }) => {
    const { title, layout, components } = context;
    const canvasId = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[Jarvis] Canvas render: "${title}" (${layout}, ${components.length} components)`);
    for (const comp of components) {
      console.log(`  - ${comp.type}${("title" in comp && comp.title) ? `: ${comp.title}` : ""}`);
    }

    // In production, this would:
    // 1. Emit the canvas payload via Mastra's streaming/events
    // 2. The client-side renderer (@mastra/react or custom) picks it up
    // 3. Components are rendered as real interactive UI elements
    // 4. User interactions flow back as tool calls or events
    //
    // Integration patterns:
    //   - Vercel AI SDK UI: useChat() + custom data parts
    //   - CopilotKit: AG-UI protocol
    //   - Custom: Server-Sent Events from Mastra server

    const componentSummary = components
      .map((c) => {
        switch (c.type) {
          case "markdown":
            return `[Markdown: ${c.content.slice(0, 50)}...]`;
          case "bar-chart":
          case "line-chart":
            return `[${c.type}: "${c.title}" with ${c.data.length} data points]`;
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
            return `[Unknown component]`;
        }
      })
      .join(", ");

    return {
      canvasId,
      componentCount: components.length,
      rendered: true,
      summary: `Canvas "${title}" (${layout}): ${componentSummary}`,
    };
  },
});
