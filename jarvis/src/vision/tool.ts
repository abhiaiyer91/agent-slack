/**
 * Vision tool for Jarvis.
 *
 * Uses the AI SDK's native multi-modal support to analyze images
 * via the best available vision-capable model (Claude > GPT-4o > Gemini).
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { generateText } from "ai";
import { createVisionModel } from "../mastra/models.js";

export const visionTool = createTool({
  id: "vision",
  description:
    "Analyze an image and describe its contents. Use this when the user sends an image, asks you to look at something, or when visual analysis would help answer a question. Accepts image URLs or base64-encoded image data.",
  inputSchema: z.object({
    imageUrl: z
      .string()
      .optional()
      .describe("URL of the image to analyze"),
    imageBase64: z
      .string()
      .optional()
      .describe("Base64-encoded image data (without data: prefix)"),
    mimeType: z
      .enum(["image/jpeg", "image/png", "image/gif", "image/webp"])
      .default("image/jpeg")
      .describe("MIME type of the base64 image"),
    prompt: z
      .string()
      .default("Describe this image in detail. Note any text, objects, people, colors, layout, and anything notable.")
      .describe("Specific instruction for the analysis"),
  }),
  outputSchema: z.object({
    description: z.string(),
    hasText: z.boolean(),
    dominantColors: z.array(z.string()).optional(),
    objects: z.array(z.string()).optional(),
  }),
  execute: async ({ imageUrl, imageBase64, mimeType, prompt }) => {
    if (!imageUrl && !imageBase64) {
      return {
        description: "No image provided. Please supply either an imageUrl or imageBase64.",
        hasText: false,
        dominantColors: [] as string[],
        objects: [] as string[],
      };
    }

    try {
      const imagePart = imageUrl
        ? { type: "image" as const, image: new URL(imageUrl) }
        : { type: "image" as const, image: Buffer.from(imageBase64!, "base64"), mimeType: mimeType ?? "image/jpeg" };

      const result = await generateText({
        model: createVisionModel(),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt ?? "Describe this image in detail." },
              imagePart,
            ],
          },
        ],
        maxOutputTokens: 1024,
      });

      const text = result.text;
      const hasText = /\b(text|word|letter|label|sign|caption|title|heading|number|digit)\b/i.test(text);
      const colorMatches = text.match(/\b(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey|brown|gold|silver|teal|navy|cyan|magenta)\b/gi);
      const dominantColors: string[] = colorMatches
        ? [...new Set(colorMatches.map((c: string) => c.toLowerCase()))]
        : [];

      return {
        description: text,
        hasText,
        dominantColors,
        objects: [],
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        description: `Vision analysis failed: ${error}. Ensure a vision-capable model API key is set.`,
        hasText: false,
        dominantColors: [],
        objects: [],
      };
    }
  },
});
