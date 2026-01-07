/**
 * @sandterm/core - The core engine for sandterm
 * 
 * A provider-agnostic AI terminal that works with any sandbox provider.
 * 
 * Better than Warp because:
 * - Provider agnostic (local, E2B, Daytona, or your own)
 * - Native AI agent support (Claude Code, Codex, Aider)
 * - Predictive commands
 * - Workflow engine
 * - Voice commands
 * - Plugin system
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
export { CommandPredictor } from './ai/predictor.js';
export type { Prediction, PredictionContext } from './ai/predictor.js';

// AI Agents
export { AgentRunner } from './agents/runner.js';
export type { AgentType, AgentConfig, AgentSession } from './agents/runner.js';

// Workflows
export { WorkflowEngine, WORKFLOW_TEMPLATES } from './workflows/engine.js';
export type { Workflow, WorkflowStep, WorkflowRun } from './workflows/engine.js';

// Voice
export { VoiceCommandProcessor } from './voice/recognizer.js';
export type { VoiceCommand } from './voice/recognizer.js';

// Plugins
export { pluginManager, gitShortcutsPlugin, commandLoggerPlugin } from './plugins/manager.js';
export type { Plugin, PluginCommand, PluginComponent, PluginManifest } from './plugins/manager.js';

// Types
export * from './types/index.js';
export * from './types/provider.js';

// Utils
export { logger, createLogger } from './utils/logger.js';
export { config_, env } from './utils/config.js';
