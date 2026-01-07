/**
 * @sandterm/core - The core engine for sandterm
 * 
 * A provider-agnostic AI terminal that works with any sandbox provider.
 */

// Main engine
export { Sandterm, createSandterm } from './sandterm.js';
export type { SandtermConfig } from './sandterm.js';

// Server
export { createServer, startServer } from './server.js';
export type { ServerConfig } from './server.js';

// Provider system
export { providerRegistry, registerProvider, BaseProvider } from './providers/index.js';

// AI
export { AIService } from './ai/service.js';
export { CommandAnalyzer } from './ai/analyzer.js';

// Types
export * from './types/index.js';
export * from './types/provider.js';

// Utils
export { logger, createLogger } from './utils/logger.js';
export { config_, env } from './utils/config.js';
