/**
 * Daytona Provider - Cloud workspaces using Daytona.io
 * 
 * Daytona provides self-hosted and cloud development environments.
 * 
 * @see https://daytona.io
 */

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

export interface DaytonaProviderConfig extends ProviderConfig {
  apiKey: string;
  apiUrl?: string;
  defaultImage?: string;
}

interface DaytonaWorkspace {
  id: string;
  name: string;
  state?: string;
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  createdAt?: string;
}

interface DaytonaListResponse {
  workspaces?: DaytonaWorkspace[];
}

interface DaytonaExecResponse {
  output?: string;
  exitCode?: number;
}

export class DaytonaProvider implements SandboxProvider {
  readonly id = 'daytona';
  readonly name = 'Daytona';
  readonly description = 'Cloud workspaces using Daytona.io';

  private config: DaytonaProviderConfig = { apiKey: '' };
  private sandboxes: Map<string, Sandbox> = new Map();
  private sessions: Map<string, TerminalSession> = new Map();
  private outputHandlers: Map<string, Set<(data: string) => void>> = new Map();
  private sshConnections: Map<string, unknown> = new Map();

  private get apiUrl(): string {
    return this.config.apiUrl || 'https://api.daytona.io';
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  async init(config: ProviderConfig): Promise<void> {
    this.config = config as DaytonaProviderConfig;
  }

  isReady(): boolean {
    return !!this.config.apiKey;
  }

  // =========================================================================
  // Sandbox Lifecycle
  // =========================================================================

  async createSandbox(options: SandboxCreateOptions): Promise<Sandbox> {
    const id = uuid();

    const payload = {
      id,
      name: options.name,
      target: 'local',
      projects: [{
        name: options.name,
        image: options.image || this.config.defaultImage || 'daytonaio/workspace:latest',
        envVars: options.env,
      }],
    };

    if (this.config.apiKey) {
      const response = await fetch(`${this.apiUrl}/workspace`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create workspace: ${await response.text()}`);
      }

      const data = (await response.json()) as DaytonaWorkspace;
      
      const sandbox: Sandbox = {
        id: data.id || id,
        name: options.name,
        status: 'creating',
        host: data.sshHost,
        port: data.sshPort,
        user: data.sshUser || 'daytona',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { daytonaId: data.id },
      };

      this.sandboxes.set(sandbox.id, sandbox);
      return sandbox;
    }

    // Local mode (no API key)
    const sandbox: Sandbox = {
      id,
      name: options.name,
      status: 'running',
      host: 'localhost',
      port: 22,
      user: 'daytona',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.sandboxes.set(id, sandbox);
    return sandbox;
  }

  async getSandbox(id: string): Promise<Sandbox | null> {
    const sandbox = this.sandboxes.get(id);
    
    if (sandbox && this.config.apiKey) {
      try {
        const response = await fetch(`${this.apiUrl}/workspace/${id}`, {
          headers: this.headers,
        });
        
        if (response.ok) {
          const data = (await response.json()) as DaytonaWorkspace;
          sandbox.status = this.mapStatus(data.state);
          sandbox.host = data.sshHost || sandbox.host;
          sandbox.port = data.sshPort || sandbox.port;
          sandbox.updatedAt = new Date();
        }
      } catch {
        // Ignore refresh errors
      }
    }

    return sandbox || null;
  }

  async listSandboxes(): Promise<Sandbox[]> {
    if (this.config.apiKey) {
      try {
        const response = await fetch(`${this.apiUrl}/workspace`, {
          headers: this.headers,
        });
        
        if (response.ok) {
          const data = (await response.json()) as DaytonaListResponse;
          return (data.workspaces || []).map((w) => ({
            id: w.id,
            name: w.name,
            status: this.mapStatus(w.state),
            host: w.sshHost,
            port: w.sshPort,
            user: w.sshUser || 'daytona',
            createdAt: w.createdAt ? new Date(w.createdAt) : new Date(),
            updatedAt: new Date(),
            metadata: {},
          }));
        }
      } catch {
        // Fall back to local cache
      }
    }

    return Array.from(this.sandboxes.values());
  }

  async startSandbox(id: string): Promise<Sandbox> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) throw new Error(`Sandbox not found: ${id}`);

    if (this.config.apiKey) {
      const response = await fetch(`${this.apiUrl}/workspace/${id}/start`, {
        method: 'POST',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to start workspace: ${await response.text()}`);
      }
    }

    sandbox.status = 'starting';
    sandbox.updatedAt = new Date();
    return sandbox;
  }

  async stopSandbox(id: string): Promise<Sandbox> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) throw new Error(`Sandbox not found: ${id}`);

    for (const [sessionId, session] of this.sessions) {
      if (session.sandboxId === id) {
        await this.closeSession(sessionId);
      }
    }

    if (this.config.apiKey) {
      await fetch(`${this.apiUrl}/workspace/${id}/stop`, {
        method: 'POST',
        headers: this.headers,
      });
    }

    sandbox.status = 'stopped';
    sandbox.updatedAt = new Date();
    return sandbox;
  }

  async deleteSandbox(id: string): Promise<void> {
    await this.stopSandbox(id).catch(() => {});

    if (this.config.apiKey) {
      await fetch(`${this.apiUrl}/workspace/${id}`, {
        method: 'DELETE',
        headers: this.headers,
      });
    }

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

    const sessionId = uuid();

    const session: TerminalSession = {
      id: sessionId,
      sandboxId,
      status: 'connected',
      shell: options.shell || '/bin/bash',
      cols: options.cols || 120,
      rows: options.rows || 40,
      cwd: options.cwd,
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async writeToSession(sessionId: string, _data: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    // In production, write to SSH stream
  }

  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    session.cols = cols;
    session.rows = rows;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.status = 'disconnected';
    this.sessions.delete(sessionId);
    this.sshConnections.delete(sessionId);
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
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) throw new Error(`Sandbox not found: ${sandboxId}`);

    if (this.config.apiKey) {
      const response = await fetch(`${this.apiUrl}/workspace/${sandboxId}/exec`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          command,
          workingDir: options?.cwd,
          envVars: options?.env,
          timeout: options?.timeout,
        }),
      });

      if (!response.ok) {
        throw new Error(`Exec failed: ${await response.text()}`);
      }

      const data = (await response.json()) as DaytonaExecResponse;
      return {
        stdout: data.output || '',
        stderr: '',
        exitCode: data.exitCode || 0,
      };
    }

    return { stdout: '', stderr: 'Not connected to Daytona API', exitCode: 1 };
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private mapStatus(apiStatus?: string): Sandbox['status'] {
    const map: Record<string, Sandbox['status']> = {
      uninitialized: 'pending',
      initializing: 'creating',
      starting: 'starting',
      running: 'running',
      stopping: 'stopping',
      stopped: 'stopped',
      error: 'error',
    };
    return map[apiStatus?.toLowerCase() || ''] || 'error';
  }
}

export const createDaytonaProvider = (): SandboxProvider => new DaytonaProvider();
