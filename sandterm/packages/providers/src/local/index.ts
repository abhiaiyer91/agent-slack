/**
 * Local Provider - Runs sandboxes locally using node-pty
 * 
 * Perfect for development and testing, or for running sandterm
 * on your own machine without cloud providers.
 */

import type { IPty } from 'node-pty';
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

interface LocalSession extends TerminalSession {
  pty: IPty;
}

export class LocalProvider implements SandboxProvider {
  readonly id = 'local';
  readonly name = 'Local';
  readonly description = 'Run sandboxes locally using node-pty';

  private config: ProviderConfig = {};
  private sandboxes: Map<string, Sandbox> = new Map();
  private sessions: Map<string, LocalSession> = new Map();
  private outputHandlers: Map<string, Set<(data: string) => void>> = new Map();

  async init(config: ProviderConfig): Promise<void> {
    this.config = config;
  }

  isReady(): boolean {
    return true; // Local is always ready
  }

  // =========================================================================
  // Sandbox Lifecycle
  // =========================================================================

  async createSandbox(options: SandboxCreateOptions): Promise<Sandbox> {
    const id = uuid();
    const sandbox: Sandbox = {
      id,
      name: options.name,
      status: 'running', // Local sandboxes are immediately ready
      host: 'localhost',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { env: options.env },
    };

    this.sandboxes.set(id, sandbox);
    return sandbox;
  }

  async getSandbox(id: string): Promise<Sandbox | null> {
    return this.sandboxes.get(id) || null;
  }

  async listSandboxes(): Promise<Sandbox[]> {
    return Array.from(this.sandboxes.values());
  }

  async startSandbox(id: string): Promise<Sandbox> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) throw new Error(`Sandbox not found: ${id}`);
    sandbox.status = 'running';
    sandbox.updatedAt = new Date();
    return sandbox;
  }

  async stopSandbox(id: string): Promise<Sandbox> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) throw new Error(`Sandbox not found: ${id}`);
    
    // Close all sessions for this sandbox
    for (const [sessionId, session] of this.sessions) {
      if (session.sandboxId === id) {
        await this.closeSession(sessionId);
      }
    }

    sandbox.status = 'stopped';
    sandbox.updatedAt = new Date();
    return sandbox;
  }

  async deleteSandbox(id: string): Promise<void> {
    await this.stopSandbox(id).catch(() => {});
    this.sandboxes.delete(id);
  }

  // =========================================================================
  // Terminal Operations
  // =========================================================================

  async createSession(
    sandboxId: string, 
    options: TerminalSessionOptions = {}
  ): Promise<TerminalSession> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) throw new Error(`Sandbox not found: ${sandboxId}`);
    if (sandbox.status !== 'running') throw new Error(`Sandbox not running: ${sandboxId}`);

    const nodePty = await import('node-pty');
    const sessionId = uuid();

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      ...(sandbox.metadata.env as Record<string, string>),
      ...options.env,
    };

    const pty = nodePty.spawn(options.shell || '/bin/bash', [], {
      name: 'xterm-256color',
      cols: options.cols || 120,
      rows: options.rows || 40,
      cwd: options.cwd || process.env.HOME || '/tmp',
      env,
    });

    const session: LocalSession = {
      id: sessionId,
      sandboxId,
      status: 'connected',
      shell: options.shell || '/bin/bash',
      cols: options.cols || 120,
      rows: options.rows || 40,
      cwd: options.cwd,
      createdAt: new Date(),
      pty,
    };

    // Set up output handling
    pty.onData((data: string) => {
      const handlers = this.outputHandlers.get(sessionId);
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
    });

    pty.onExit(() => {
      session.status = 'disconnected';
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  async writeToSession(sessionId: string, data: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    session.pty.write(data);
  }

  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    session.pty.resize(cols, rows);
    session.cols = cols;
    session.rows = rows;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.pty.kill();
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
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) throw new Error(`Sandbox not found: ${sandboxId}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        timeout: options?.timeout ? options.timeout * 1000 : undefined,
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; code?: number };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || String(error),
        exitCode: execError.code || 1,
      };
    }
  }
}

export const createLocalProvider = (): SandboxProvider => new LocalProvider();
