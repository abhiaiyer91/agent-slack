/**
 * Jarvis — The Ultimate AI Assistant
 * Built on Mastra, from the team behind Gatsby.
 */

// Core
export { mastra } from "./mastra/index.js";
export { jarvisAgent, initJarvis } from "./mastra/agents/jarvis.js";
export { createModelConfig, createFastModel, createVisionModel } from "./mastra/models.js";

// Tools
export { webSearchTool, fileSystemTool, systemStatusTool, browserTool, emailTool, getMCPTools } from "./mastra/tools/index.js";
export { visionTool } from "./vision/tool.js";
export { canvasTool } from "./canvas/tool.js";

// Canvas
export { renderCanvas } from "./canvas/renderer.js";

// Workflows
export { dailyBriefingWorkflow } from "./mastra/workflows/daily-briefing.js";
export { researchWorkflow } from "./mastra/workflows/research.js";
export { prReviewWorkflow } from "./mastra/workflows/pr-review.js";

// Voice
export { createVoice, describeVoiceCapabilities } from "./voice/provider.js";

// Integrations
export { channelRegistry } from "./integrations/channels.js";
export { checkSecurity, allowSender, revokeSender } from "./integrations/security.js";
export { SlackChannel, startSlackBot } from "./integrations/slack.js";
export { DiscordChannel, startDiscordBot } from "./integrations/discord.js";
export { TelegramChannel, startTelegramBot } from "./integrations/telegram.js";

// Scheduler
export { Scheduler } from "./scheduler.js";

// Re-export types
export type { InboundMessage, OutboundMessage, Channel } from "./integrations/channels.js";
export type { SecurityCheckResult } from "./integrations/security.js";
