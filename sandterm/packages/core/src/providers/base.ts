/**
 * Base Provider - Abstract base class with common functionality
 * 
 * Extend this class to create new providers with less boilerplate.
 */

import { v4 as uuid } from 'uuid';
import type { 
  SandboxProvider, 
  ProviderConfig,
  ExecOptions,
  ExecResult 
} from '../types/provider.js';
import type { 
  Sandbox, 
  SandboxCreateOptions, 
  TerminalSession, 
  TerminalSessionOptions 
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';

export abstract class BaseProvider implements SandboxProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;

  protected config: ProviderConfig = {};
  protected _logger: ReturnType<typeof createLogger> | null = null;
  protected sandboxes: Map<string, Sandbox> = new Map();
  protected sessions: Map<string, TerminalSession> = new Map();
  protected outputHandlers: Map<string, Set<(data: string) => void>> = new Map();

  protected get logger() {
    if (!this._logger) {
      this._logger = createLogger(this.id || 'provider');
    }
    return this._logger;
  }

  async init(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.logger.info('Provider initialized');
  }

  isReady(): boolean {
    return true;
  }

  // =========================================================================
  // Abstract methods - Must be implemented by providers
  // =========================================================================

  abstract createSandbox(options: SandboxCreateOptions): Promise<Sandbox>;
  abstract startSandbox(id: string): Promise<Sandbox>;
  abstract stopSandbox(id: string): Promise<Sandbox>;
  abstract deleteSandbox(id: string): Promise<void>;
  abstract createSession(sandboxId: string, options?: TerminalSessionOptions): Promise<TerminalSession>;
  abstract writeToSession(sessionId: string, data: string): Promise<void>;
  abstract closeSession(sessionId: string): Promise<void>;

  // =========================================================================
  // Common implementations
  // =========================================================================

  async getSandbox(id: string): Promise<Sandbox | null> {
    return this.sandboxes.get(id) || null;
  }

  async listSandboxes(): Promise<Sandbox[]> {
    return Array.from(this.sandboxes.values());
  }

  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cols = cols;
      session.rows = rows;
    }
  }

  onSessionOutput(sessionId: string, handler: (data: string) => void): () => void {
    if (!this.outputHandlers.has(sessionId)) {
      this.outputHandlers.set(sessionId, new Set());
    }
    this.outputHandlers.get(sessionId)!.add(handler);

    return () => {
      this.outputHandlers.get(sessionId)?.delete(handler);
    };
  }

  // =========================================================================
  // Helper methods for subclasses
  // =========================================================================

  protected generateId(): string {
    return uuid();
  }

  protected emitOutput(sessionId: string, data: string): void {
    const handlers = this.outputHandlers.get(sessionId);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  protected createSandboxObject(
    id: string,
    name: string,
    status: Sandbox['status'] = 'creating',
    extra: Partial<Sandbox> = {}
  ): Sandbox {
    return {
      id,
      name,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      ...extra,
    };
  }

  protected createSessionObject(
    id: string,
    sandboxId: string,
    options: TerminalSessionOptions = {}
  ): TerminalSession {
    return {
      id,
      sandboxId,
      status: 'connecting',
      shell: options.shell || '/bin/bash',
      cols: options.cols || 120,
      rows: options.rows || 40,
      cwd: options.cwd,
      createdAt: new Date(),
    };
  }
}
