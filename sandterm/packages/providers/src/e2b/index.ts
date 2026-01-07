/**
 * E2B Provider - Cloud sandboxes using E2B (e2b.dev)
 * 
 * E2B provides secure cloud sandboxes for AI agents.
 * This provider uses the official E2B SDK v1.x.
 * 
 * @see https://e2b.dev/docs
 */

import { Sandbox as E2BSandbox } from 'e2b';
import { v4 as uuid } from 'uuid';
import type { 
  SandboxProvider, 
  ProviderConfig,
  ExecOptions,
  ExecResult,
  Sandbox, 
  SandboxCreateOptions, 
  TerminalSession, 
  TerminalSessionOptions 
} from '@sandterm/core';

interface E2BSession extends TerminalSession {
  e2bSandbox: E2BSandbox;
  terminalPid?: number;
}

export interface E2BProviderConfig extends ProviderConfig {
  apiKey: string;
  template?: string;
  timeout?: number;
}

export class E2BProvider implements SandboxProvider {
  readonly id = 'e2b';
  readonly name = 'E2B';
  readonly description = 'Cloud sandboxes using E2B (e2b.dev)';

  private config: E2BProviderConfig = { apiKey: '' };
  private sandboxes: Map<string, { sandbox: Sandbox; e2b: E2BSandbox }> = new Map();
  private sessions: Map<string, E2BSession> = new Map();
  private outputHandlers: Map<string, Set<(data: string) => void>> = new Map();

  async init(config: ProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('E2B API key is required. Get one at https://e2b.dev');
    }
    this.config = config as E2BProviderConfig;
  }

  isReady(): boolean {
    return !!this.config.apiKey;
  }

  // =========================================================================
  // Sandbox Lifecycle
  // =========================================================================

  async createSandbox(options: SandboxCreateOptions): Promise<Sandbox> {
    const id = uuid();
    
    const e2bSandbox = await E2BSandbox.create(
      options.template || this.config.template || 'base',
      {
        apiKey: this.config.apiKey,
        timeoutMs: (options.timeout || this.config.timeout || 300) * 1000,
        envs: options.env,
      }
    );

    const sandbox: Sandbox = {
      id,
      name: options.name,
      status: 'running',
      host: e2bSandbox.getHost(80),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        e2bId: e2bSandbox.sandboxId,
        template: options.template || this.config.template || 'base',
      },
    };

    this.sandboxes.set(id, { sandbox, e2b: e2bSandbox });
    return sandbox;
  }

  async getSandbox(id: string): Promise<Sandbox | null> {
    const entry = this.sandboxes.get(id);
    return entry?.sandbox || null;
  }

  async listSandboxes(): Promise<Sandbox[]> {
    return Array.from(this.sandboxes.values()).map(e => e.sandbox);
  }

  async startSandbox(id: string): Promise<Sandbox> {
    const entry = this.sandboxes.get(id);
    if (!entry) throw new Error(`Sandbox not found: ${id}`);
    return entry.sandbox;
  }

  async stopSandbox(id: string): Promise<Sandbox> {
    const entry = this.sandboxes.get(id);
    if (!entry) throw new Error(`Sandbox not found: ${id}`);
    
    for (const [sessionId, session] of this.sessions) {
      if (session.sandboxId === id) {
        await this.closeSession(sessionId);
      }
    }

    await entry.e2b.kill();
    entry.sandbox.status = 'stopped';
    entry.sandbox.updatedAt = new Date();
    
    return entry.sandbox;
  }

  async deleteSandbox(id: string): Promise<void> {
    const entry = this.sandboxes.get(id);
    if (!entry) return;
    
    await entry.e2b.kill();
    this.sandboxes.delete(id);
  }

  // =========================================================================
  // Terminal Operations
  // =========================================================================

  async createSession(
    sandboxId: string, 
    options: TerminalSessionOptions = {}
  ): Promise<TerminalSession> {
    const entry = this.sandboxes.get(sandboxId);
    if (!entry) throw new Error(`Sandbox not found: ${sandboxId}`);

    const sessionId = uuid();

    const terminal = await entry.e2b.pty.create({
      cols: options.cols || 120,
      rows: options.rows || 40,
      cwd: options.cwd,
      envs: options.env,
      onData: (data: Uint8Array) => {
        const text = new TextDecoder().decode(data);
        const handlers = this.outputHandlers.get(sessionId);
        if (handlers) {
          handlers.forEach(handler => handler(text));
        }
      },
    });

    const session: E2BSession = {
      id: sessionId,
      sandboxId,
      status: 'connected',
      shell: options.shell || '/bin/bash',
      cols: options.cols || 120,
      rows: options.rows || 40,
      cwd: options.cwd,
      createdAt: new Date(),
      e2bSandbox: entry.e2b,
      terminalPid: terminal.pid,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async writeToSession(sessionId: string, data: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    await session.e2bSandbox.pty.sendInput(session.terminalPid!, new TextEncoder().encode(data));
  }

  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    await session.e2bSandbox.pty.resize(session.terminalPid!, { cols, rows });
    session.cols = cols;
    session.rows = rows;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    if (session.terminalPid) {
      await session.e2bSandbox.pty.kill(session.terminalPid);
    }
    
    session.status = 'disconnected';
    this.sessions.delete(sessionId);
    this.outputHandlers.delete(sessionId);
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
  // Direct Execution
  // =========================================================================

  async exec(sandboxId: string, command: string, options?: ExecOptions): Promise<ExecResult> {
    const entry = this.sandboxes.get(sandboxId);
    if (!entry) throw new Error(`Sandbox not found: ${sandboxId}`);

    const result = await entry.e2b.commands.run(command, {
      cwd: options?.cwd,
      envs: options?.env,
      timeoutMs: options?.timeout ? options.timeout * 1000 : undefined,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }

  // =========================================================================
  // E2B-specific features
  // =========================================================================

  static async listTemplates(): Promise<string[]> {
    return ['base', 'python', 'node', 'go', 'rust'];
  }

  async uploadFile(sandboxId: string, path: string, content: string | ArrayBuffer): Promise<void> {
    const entry = this.sandboxes.get(sandboxId);
    if (!entry) throw new Error(`Sandbox not found: ${sandboxId}`);
    
    if (typeof content === 'string') {
      await entry.e2b.files.write(path, content);
    } else {
      await entry.e2b.files.write(path, content);
    }
  }

  async downloadFile(sandboxId: string, path: string): Promise<string> {
    const entry = this.sandboxes.get(sandboxId);
    if (!entry) throw new Error(`Sandbox not found: ${sandboxId}`);
    
    const data = await entry.e2b.files.read(path);
    if (typeof data === 'string') {
      return data;
    }
    return new TextDecoder().decode(data as Uint8Array);
  }
}

export const createE2BProvider = (): SandboxProvider => new E2BProvider();
