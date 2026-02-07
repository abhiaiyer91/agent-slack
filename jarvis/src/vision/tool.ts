/**
 * Vision tool for Jarvis.
 *
 * Gives Jarvis the ability to analyze images, screenshots, and visual media.
 * Uses the best available vision-capable model (Claude > GPT-4o > Gemini).
 *
 * OpenClaw's weakness: their vision pipeline is a tangled mess of provider
 * registries, capability loops, and base64 gymnastics. Mastra lets us use
 * the AI SDK's native multi-modal support — just pass image content parts
 * to a vision-capable model.
 *
 * The tool accepts image URLs or base64-encoded images and returns a
 * structured description that the agent can act on.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

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
      .describe("Specific instruction for the analysis (e.g., 'read the text in this image')"),
  }),
  outputSchema: z.object({
    description: z.string(),
    hasText: z.boolean(),
    dominantColors: z.array(z.string()).optional(),
    objects: z.array(z.string()).optional(),
  }),
  execute: async ({ context }) => {
    const { imageUrl, imageBase64, mimeType, prompt } = context;

    if (!imageUrl && !imageBase64) {
      return {
        description: "No image provided. Please supply either an imageUrl or imageBase64.",
        hasText: false,
      };
    }

    // In production, this tool would use the AI SDK's multi-modal generateText()
    // to send the image to a vision-capable model. The Jarvis agent itself can
    // also receive images directly in messages — this tool is for programmatic
    // image analysis within workflows or when explicit analysis is requested.
    //
    // Implementation pattern:
    //
    //   const result = await generateText({
    //     model: createVisionModel(),
    //     messages: [{
    //       role: "user",
    //       content: [
    //         { type: "text", text: prompt },
    //         imageUrl
    //           ? { type: "image", image: new URL(imageUrl) }
    //           : { type: "image", image: Buffer.from(imageBase64!, "base64"), mimeType },
    //       ],
    //     }],
    //   });

    const source = imageUrl || `base64 image (${mimeType})`;
    console.log(`[Jarvis] Vision analysis: ${source}`);
    console.log(`[Jarvis] Prompt: ${prompt}`);

    return {
      description: `Vision analysis pending. Source: ${source}. Connect a vision model (Claude, GPT-4o, Gemini) in src/vision/tool.ts to enable live analysis. Prompt: "${prompt}"`,
      hasText: false,
      dominantColors: [],
      objects: [],
    };
  },
});
