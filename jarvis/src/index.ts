/**
 * Jarvis — The Ultimate AI Assistant
 * Built on Mastra, from the team behind Gatsby.
 *
 * Entry point. Initializes the Mastra runtime and starts the server.
 *
 * Usage:
 *   Development:  npm run dev    (mastra dev — hot reload + playground UI)
 *   Production:   npm run build && npm start
 */

export { mastra } from "./mastra/index.js";
export { jarvisAgent } from "./mastra/agents/jarvis.js";
export { channelRegistry } from "./integrations/channels.js";
export { checkSecurity, allowSender, revokeSender } from "./integrations/security.js";

// Re-export types for consumers
export type { InboundMessage, OutboundMessage, Channel } from "./integrations/channels.js";
export type { SecurityCheckResult } from "./integrations/security.js";
