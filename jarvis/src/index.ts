/**
 * Jarvis — The Ultimate AI Assistant
 * Built on Mastra, from the team behind Gatsby.
 *
 * Usage:
 *   npm run serve        → http://localhost:3033 (chat UI + API)
 *   npm run dev          → mastra dev (playground UI)
 *   npm test             → run test harness
 */

// Core
export { mastra } from "./mastra/index.js";
export { jarvisAgent } from "./mastra/agents/jarvis.js";
export { createModelConfig, createFastModel, createVisionModel } from "./mastra/models.js";

// Tools
export { webSearchTool, fileSystemTool, systemStatusTool, getMCPTools } from "./mastra/tools/index.js";
export { visionTool } from "./vision/tool.js";
export { canvasTool } from "./canvas/tool.js";

// Canvas
export { renderCanvas } from "./canvas/renderer.js";

// Workflows
export { dailyBriefingWorkflow } from "./mastra/workflows/daily-briefing.js";
export { researchWorkflow } from "./mastra/workflows/research.js";

// Voice
export { createVoice, describeVoiceCapabilities } from "./voice/provider.js";

// Integrations
export { channelRegistry } from "./integrations/channels.js";
export { checkSecurity, allowSender, revokeSender } from "./integrations/security.js";
export { SlackChannel } from "./integrations/slack.js";

// Re-export types
export type { InboundMessage, OutboundMessage, Channel } from "./integrations/channels.js";
export type { SecurityCheckResult } from "./integrations/security.js";
