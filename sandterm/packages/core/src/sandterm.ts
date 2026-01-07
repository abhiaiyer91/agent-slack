/**
 * Sandterm - The main engine that orchestrates everything
 * 
 * This is the primary interface for using sandterm.
 */

import { v4 as uuid } from 'uuid';
import type { SandboxProvider, ProviderConfig } from './types/provider.js';
import type { 
  Sandbox, 
  SandboxCreateOptions, 
  TerminalSession, 
  TerminalSessionOptions,
  CommandBlock,
  SandtermEvent,
  SandtermEventHandler,
} from './types/index.js';
import { providerRegistry } from './providers/registry.js';
import { AIService } from './ai/service.js';
import { CommandAnalyzer } from './ai/analyzer.js';
import { createLogger } from './utils/logger.js';
import { config_ } from './utils/config.js';

const logger = createLogger('sandterm');

export interface SandtermConfig {
  provider: string;
  providerConfig?: ProviderConfig;
  ai?: {
    provider?: 'anthropic' | 'openai';
    apiKey?: string;
  };
}

export class Sandterm {
  private provider!: SandboxProvider;
  private ai: AIService;
  private analyzer: CommandAnalyzer;
  private eventHandlers: Map<string, Set<SandtermEventHandler>> = new Map();
  private sessionBlocks: Map<string, CommandBlock[]> = new Map();
  private outputBuffers: Map<string, string[]> = new Map();
  private currentCommand: Map<string, string> = new Map();

  constructor(private config: SandtermConfig) {
    this.ai = new AIService({
      provider: config.ai?.provider || config_.ai.defaultProvider,
      apiKey: config.ai?.apiKey || 
        (config_.ai.defaultProvider === 'anthropic' 
          ? config_.ai.anthropicKey 
          : config_.ai.openaiKey),
    });
    this.analyzer = new CommandAnalyzer(this.ai);
  }

  /**
   * Initialize sandterm with the configured provider
   */
  async init(): Promise<void> {
    logger.info({ provider: this.config.provider }, 'Initializing sandterm');

    this.provider = await providerRegistry.get(
      this.config.provider,
      this.config.providerConfig
    );

    if (!this.provider.isReady()) {
      logger.warn('Provider is not fully configured, some features may be limited');
    }

    logger.info({ 
      provider: this.provider.name,
      ai: this.ai.isConfigured() ? 'enabled' : 'disabled',
    }, 'Sandterm initialized');
  }

  // =========================================================================
  // Sandbox Management
  // =========================================================================

  async createSandbox(options: SandboxCreateOptions): Promise<Sandbox> {
    logger.info({ name: options.name }, 'Creating sandbox');
    return this.provider.createSandbox(options);
  }

  async getSandbox(id: string): Promise<Sandbox | null> {
    return this.provider.getSandbox(id);
  }

  async listSandboxes(): Promise<Sandbox[]> {
    return this.provider.listSandboxes();
  }

  async startSandbox(id: string): Promise<Sandbox> {
    logger.info({ id }, 'Starting sandbox');
    return this.provider.startSandbox(id);
  }

  async stopSandbox(id: string): Promise<Sandbox> {
    logger.info({ id }, 'Stopping sandbox');
    return this.provider.stopSandbox(id);
  }

  async deleteSandbox(id: string): Promise<void> {
    logger.info({ id }, 'Deleting sandbox');
    return this.provider.deleteSandbox(id);
  }

  // =========================================================================
  // Terminal Sessions
  // =========================================================================

  async createSession(
    sandboxId: string, 
    options?: TerminalSessionOptions
  ): Promise<TerminalSession> {
    logger.info({ sandboxId }, 'Creating terminal session');
    
    const session = await this.provider.createSession(sandboxId, options);
    
    // Initialize session state
    this.sessionBlocks.set(session.id, []);
    this.outputBuffers.set(session.id, []);
    this.currentCommand.set(session.id, '');
    this.eventHandlers.set(session.id, new Set());

    // Subscribe to output
    this.provider.onSessionOutput(session.id, (data) => {
      this.handleOutput(session.id, data);
    });

    return session;
  }

  async writeToSession(sessionId: string, data: string): Promise<void> {
    // Track command input
    if (data.endsWith('\r') || data.endsWith('\n')) {
      const cmd = this.currentCommand.get(sessionId) || '';
      if (cmd.trim()) {
        this.startBlock(sessionId, cmd.trim());
      }
      this.currentCommand.set(sessionId, '');
    } else {
      const current = this.currentCommand.get(sessionId) || '';
      this.currentCommand.set(sessionId, current + data);
    }

    return this.provider.writeToSession(sessionId, data);
  }

  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    return this.provider.resizeSession(sessionId, cols, rows);
  }

  async closeSession(sessionId: string): Promise<void> {
    logger.info({ sessionId }, 'Closing session');
    await this.provider.closeSession(sessionId);
    
    // Cleanup
    this.sessionBlocks.delete(sessionId);
    this.outputBuffers.delete(sessionId);
    this.currentCommand.delete(sessionId);
    this.eventHandlers.delete(sessionId);
  }

  // =========================================================================
  // Event Handling
  // =========================================================================

  on(sessionId: string, handler: SandtermEventHandler): () => void {
    if (!this.eventHandlers.has(sessionId)) {
      this.eventHandlers.set(sessionId, new Set());
    }
    this.eventHandlers.get(sessionId)!.add(handler);

    return () => {
      this.eventHandlers.get(sessionId)?.delete(handler);
    };
  }

  private emit(sessionId: string, event: SandtermEvent): void {
    const handlers = this.eventHandlers.get(sessionId);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  private handleOutput(sessionId: string, data: string): void {
    // Store in buffer
    const buffer = this.outputBuffers.get(sessionId) || [];
    buffer.push(data);
    
    // Keep last 100KB
    let total = buffer.reduce((acc, s) => acc + s.length, 0);
    while (total > 100 * 1024 && buffer.length > 0) {
      const removed = buffer.shift()!;
      total -= removed.length;
    }
    this.outputBuffers.set(sessionId, buffer);

    // Emit output event
    this.emit(sessionId, { type: 'output', data });

    // Check for command completion (prompt returned)
    // This is simplified - real implementation would be more sophisticated
    if (data.includes('$ ') || data.includes('# ') || data.includes('➜')) {
      this.finalizeBlock(sessionId);
    }
  }

  private startBlock(sessionId: string, command: string): void {
    const blocks = this.sessionBlocks.get(sessionId) || [];
    
    const block: CommandBlock = {
      id: uuid(),
      command,
      output: '',
      exitCode: null,
      startTime: new Date(),
      endTime: null,
      cwd: process.cwd(),
    };

    blocks.push(block);
    this.sessionBlocks.set(sessionId, blocks);
  }

  private async finalizeBlock(sessionId: string): Promise<void> {
    const blocks = this.sessionBlocks.get(sessionId) || [];
    const block = blocks[blocks.length - 1];
    
    if (!block || block.endTime) return;

    block.endTime = new Date();
    block.output = this.getRecentOutput(sessionId, 5000);

    // Analyze for errors if AI is configured
    if (config_.features.commandAnalysis && this.ai.isConfigured()) {
      try {
        const analysis = await this.analyzer.analyze(block.command, block.output);
        block.analysis = analysis;

        // Emit block event
        this.emit(sessionId, { type: 'block', block });

        // If error detected, get AI suggestion
        if (analysis.hasError && config_.features.autoFix) {
          const suggestion = await this.ai.quickFix(block.command, block.output);
          if (suggestion) {
            this.emit(sessionId, { 
              type: 'suggestion', 
              suggestion: { text: suggestion.message, commands: suggestion.commands }
            });
          }
        }
      } catch (error) {
        logger.debug({ error }, 'Failed to analyze command');
      }
    }
  }

  // =========================================================================
  // AI Features
  // =========================================================================

  async chat(sessionId: string, prompt: string): Promise<{
    message: string;
    commands: string[];
  }> {
    if (!this.ai.isConfigured()) {
      throw new Error('AI is not configured');
    }

    const context = this.getRecentOutput(sessionId, 5000);
    return this.ai.chat(prompt, context);
  }

  async analyze(sessionId: string): Promise<CommandBlock | null> {
    const blocks = this.sessionBlocks.get(sessionId) || [];
    return blocks[blocks.length - 1] || null;
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  getBlocks(sessionId: string): CommandBlock[] {
    return this.sessionBlocks.get(sessionId) || [];
  }

  getRecentOutput(sessionId: string, maxBytes = 10000): string {
    const buffer = this.outputBuffers.get(sessionId) || [];
    let result = '';
    for (let i = buffer.length - 1; i >= 0 && result.length < maxBytes; i--) {
      result = buffer[i] + result;
    }
    return result.slice(-maxBytes);
  }

  getProviderInfo(): { id: string; name: string; description: string } {
    return {
      id: this.provider.id,
      name: this.provider.name,
      description: this.provider.description,
    };
  }
}

/**
 * Create a new Sandterm instance
 */
export function createSandterm(config: SandtermConfig): Sandterm {
  return new Sandterm(config);
}
