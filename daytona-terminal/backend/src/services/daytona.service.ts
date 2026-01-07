import { v4 as uuid } from 'uuid';
import { config_ } from '../utils/config.js';
import { createLogger } from '../utils/logger.js';
import type { Workspace, WorkspaceCreate, WorkspaceUpdate, WorkspaceStatus } from '../models/workspace.js';

const logger = createLogger('daytona');

export class DaytonaError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'DaytonaError';
  }
}

export class DaytonaService {
  private workspaces: Map<string, Workspace> = new Map();

  private get headers(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (config_.daytona.apiKey) {
      headers['Authorization'] = `Bearer ${config_.daytona.apiKey}`;
    }
    return headers;
  }

  async createWorkspace(request: WorkspaceCreate): Promise<Workspace> {
    const workspaceId = uuid();
    logger.info({ name: request.name, id: workspaceId }, 'Creating workspace');

    const workspace: Workspace = {
      id: workspaceId,
      name: request.name,
      status: 'creating',
      repositoryUrl: request.repositoryUrl,
      branch: request.branch || 'main',
      image: request.image || config_.daytona.defaultImage,
      aiAssistant: request.aiAssistant,
      aiAssistantInstalled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        envVars: request.envVars,
        dotfilesUrl: request.dotfilesUrl,
      },
    };

    if (config_.daytona.isConfigured) {
      try {
        const created = await this.createViaApi(request, workspaceId);
        Object.assign(workspace, created);
      } catch (error) {
        logger.error({ error }, 'Failed to create workspace via Daytona API');
        workspace.status = 'error';
        workspace.metadata.error = String(error);
      }
    } else {
      // Local mode - simulate creation
      logger.info('Running in local mode (no Daytona API key)');
      await this.simulateCreation(workspace);
    }

    this.workspaces.set(workspaceId, workspace);
    return workspace;
  }

  private async createViaApi(request: WorkspaceCreate, workspaceId: string): Promise<Partial<Workspace>> {
    const payload = {
      id: workspaceId,
      name: request.name,
      target: 'local',
      projects: [
        {
          name: request.name,
          repository: request.repositoryUrl ? {
            url: request.repositoryUrl,
            branch: request.branch,
          } : null,
          image: request.image || config_.daytona.defaultImage,
          envVars: request.envVars,
        },
      ],
    };

    const response = await fetch(`${config_.daytona.apiUrl}/workspace`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new DaytonaError(`Failed to create workspace: ${await response.text()}`, response.status);
    }

    const data = await response.json();
    return {
      id: data.id || workspaceId,
      sshHost: data.sshHost,
      sshPort: data.sshPort,
      sshUser: data.sshUser || 'daytona',
      ideUrl: data.ideUrl,
    };
  }

  private async simulateCreation(workspace: Workspace): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    workspace.status = 'running';
    workspace.sshHost = 'localhost';
    workspace.sshPort = 2222;
    workspace.sshUser = 'daytona';
    workspace.cpuCores = 4;
    workspace.memoryGb = 8;
    workspace.diskGb = 50;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    let workspace = this.workspaces.get(workspaceId);

    if (workspace && config_.daytona.isConfigured) {
      try {
        const updated = await this.getFromApi(workspaceId);
        Object.assign(workspace, updated);
        this.workspaces.set(workspaceId, workspace);
      } catch {
        logger.warn({ workspaceId }, 'Failed to refresh workspace status');
      }
    }

    return workspace || null;
  }

  private async getFromApi(workspaceId: string): Promise<Partial<Workspace>> {
    const response = await fetch(`${config_.daytona.apiUrl}/workspace/${workspaceId}`, {
      headers: this.headers,
    });

    if (response.status === 404) {
      throw new DaytonaError('Workspace not found', 404);
    }

    if (!response.ok) {
      throw new DaytonaError(`Failed to get workspace: ${await response.text()}`, response.status);
    }

    const data = await response.json();
    const statusMap: Record<string, WorkspaceStatus> = {
      uninitialized: 'pending',
      initializing: 'creating',
      starting: 'starting',
      running: 'running',
      stopping: 'stopping',
      stopped: 'stopped',
      error: 'error',
    };

    return {
      status: statusMap[data.state?.toLowerCase()] || 'error',
      sshHost: data.sshHost,
      sshPort: data.sshPort,
      sshUser: data.sshUser || 'daytona',
      ideUrl: data.ideUrl,
    };
  }

  async listWorkspaces(page = 1, perPage = 20): Promise<{ workspaces: Workspace[]; total: number }> {
    const all = Array.from(this.workspaces.values());
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
      workspaces: all.slice(start, end),
      total: all.length,
    };
  }

  async updateWorkspace(workspaceId: string, update: WorkspaceUpdate): Promise<Workspace | null> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) return null;

    if (update.name) workspace.name = update.name;
    if (update.envVars) {
      workspace.metadata.envVars = {
        ...(workspace.metadata.envVars as Record<string, string>),
        ...update.envVars,
      };
    }
    workspace.updatedAt = new Date();
    
    this.workspaces.set(workspaceId, workspace);
    return workspace;
  }

  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    logger.info({ workspaceId }, 'Deleting workspace');

    if (config_.daytona.isConfigured) {
      try {
        const response = await fetch(`${config_.daytona.apiUrl}/workspace/${workspaceId}`, {
          method: 'DELETE',
          headers: this.headers,
        });
        if (!response.ok && response.status !== 404) {
          throw new DaytonaError(`Failed to delete workspace: ${await response.text()}`, response.status);
        }
      } catch (error) {
        if (error instanceof DaytonaError) throw error;
        logger.error({ error }, 'Failed to delete workspace via API');
      }
    }

    this.workspaces.delete(workspaceId);
    return true;
  }

  async startWorkspace(workspaceId: string): Promise<Workspace | null> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) return null;
    if (workspace.status === 'running') return workspace;

    logger.info({ workspaceId }, 'Starting workspace');

    if (config_.daytona.isConfigured) {
      const response = await fetch(`${config_.daytona.apiUrl}/workspace/${workspaceId}/start`, {
        method: 'POST',
        headers: this.headers,
      });
      if (!response.ok) {
        workspace.status = 'error';
        return workspace;
      }
    }

    workspace.status = config_.daytona.isConfigured ? 'starting' : 'running';
    this.workspaces.set(workspaceId, workspace);
    return workspace;
  }

  async stopWorkspace(workspaceId: string): Promise<Workspace | null> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) return null;
    if (workspace.status === 'stopped') return workspace;

    logger.info({ workspaceId }, 'Stopping workspace');

    if (config_.daytona.isConfigured) {
      await fetch(`${config_.daytona.apiUrl}/workspace/${workspaceId}/stop`, {
        method: 'POST',
        headers: this.headers,
      });
    }

    workspace.status = config_.daytona.isConfigured ? 'stopping' : 'stopped';
    this.workspaces.set(workspaceId, workspace);
    return workspace;
  }

  async executeCommand(
    workspaceId: string,
    command: string,
    options?: { workingDir?: string; envVars?: Record<string, string>; timeout?: number }
  ): Promise<{ output: string; exitCode: number }> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) throw new DaytonaError(`Workspace not found: ${workspaceId}`);
    if (workspace.status !== 'running') throw new DaytonaError(`Workspace is not running: ${workspace.status}`);

    logger.debug({ workspaceId, command }, 'Executing command');

    if (config_.daytona.isConfigured) {
      const response = await fetch(`${config_.daytona.apiUrl}/workspace/${workspaceId}/exec`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          command,
          workingDir: options?.workingDir,
          envVars: options?.envVars || {},
          timeout: options?.timeout || 60,
        }),
      });

      if (!response.ok) {
        throw new DaytonaError(`Command execution failed: ${await response.text()}`, response.status);
      }

      const data = await response.json();
      return { output: data.output || '', exitCode: data.exitCode || 0 };
    }

    // Local execution
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: options?.workingDir,
        env: { ...process.env, ...options?.envVars },
        timeout: (options?.timeout || 60) * 1000,
      });
      return { output: stdout + stderr, exitCode: 0 };
    } catch (error: unknown) {
      const execError = error as { code?: number; stdout?: string; stderr?: string };
      return {
        output: (execError.stdout || '') + (execError.stderr || ''),
        exitCode: execError.code || 1,
      };
    }
  }
}

// Singleton
export const daytonaService = new DaytonaService();
