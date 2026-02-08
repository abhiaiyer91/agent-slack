/**
 * Model configuration for Jarvis.
 *
 * Mastra supports 40+ providers through a single interface. We default to
 * Anthropic Claude (best prompt-injection resistance and long-context), with
 * automatic fallback to OpenAI and Google if Claude is unavailable.
 *
 * Swap or extend models here — the rest of Jarvis doesn't need to change.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

export type ModelProvider = "anthropic" | "openai" | "google";

interface ModelSelection {
  provider: ModelProvider;
  model: string;
}

/**
 * Resolve which model to use based on available API keys.
 * Priority: Anthropic > OpenAI > Google
 */
function resolveModel(): ModelSelection {
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", model: "claude-sonnet-4-20250514" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", model: "gpt-4o" };
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { provider: "google", model: "gemini-2.0-flash" };
  }
  // Default to OpenAI — will fail at runtime if no key is set, with a clear error
  return { provider: "openai", model: "gpt-4o" };
}

/**
 * Create the Mastra-compatible model config for the Jarvis agent.
 */
export function createModelConfig() {
  const { provider, model } = resolveModel();

  switch (provider) {
    case "anthropic":
      return anthropic(model);
    case "openai":
      return openai(model);
    case "google":
      return google(model);
    default:
      return openai("gpt-4o");
  }
}

/**
 * Create a lightweight model for fast tasks (summarization, classification).
 */
export function createFastModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic("claude-sonnet-4-20250514");
  }
  if (process.env.OPENAI_API_KEY) {
    return openai("gpt-4o-mini");
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google("gemini-2.0-flash");
  }
  return openai("gpt-4o-mini");
}

/**
 * Create a vision-capable model for image/video analysis.
 */
export function createVisionModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic("claude-sonnet-4-20250514");
  }
  if (process.env.OPENAI_API_KEY) {
    return openai("gpt-4o");
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google("gemini-2.0-flash");
  }
  return openai("gpt-4o");
}
