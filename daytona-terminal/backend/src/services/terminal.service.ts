import { v4 as uuid } from 'uuid';
import type { IPty } from 'node-pty';
import { config_ } from '../utils/config.js';
import { createLogger } from '../utils/logger.js';
import type { TerminalSession, TerminalSessionCreate, SessionStatus } from '../models/session.js';
import { daytonaService } from './daytona.service.js';
import { commandAnalyzer } from './command-analyzer.service.js';

const logger = createLogger('terminal');

interface CommandBlock {
  id: string;
  command: string;
  output: string;
  exitCode: number | null;
  startTime: Date;
  endTime: Date | null;
  cwd: string;
  analysis?: {
    hasError: boolean;
    errorType?: string;
    suggestion?: string;
  };
}

interface TerminalInstance {
  session: TerminalSession;
  pty: IPty | null;
  outputBuffer: string[];
  currentBlock: CommandBlock | null;
  blocks: CommandBlock[];
  lastCommand: string;
}

export class TerminalService {
  private terminals: Map<string, TerminalInstance> = new Map();
  private outputCallbacks: Map<string, Set<(data: string) => void>> = new Map();
  private blockCallbacks: Map<string, Set<(block: CommandBlock) => void>> = new Map();

  async createSession(request: TerminalSessionCreate): Promise<TerminalSession> {
    const sessionId = uuid();
    logger.info({ sessionId, workspaceId: request.workspaceId }, 'Creating terminal session');

    const workspace = await daytonaService.getWorkspace(request.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${request.workspaceId}`);
    }

    const session: TerminalSession = {
      id: sessionId,
      workspaceId: request.workspaceId,
      status: 'connecting',
      shell: request.shell || config_.terminal.defaultShell,
      cols: request.cols || config_.terminal.defaultCols,
      rows: request.rows || config_.terminal.defaultRows,
      workingDirectory: request.workingDirectory,
      websocketUrl: `/ws/terminal/${sessionId}`,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      aiContextEnabled: true,
      aiConversationId: undefined,
    };

    const instance: TerminalInstance = {
      session,
      pty: null,
      outputBuffer: [],
      currentBlock: null,
      blocks: [],
      lastCommand: '',
    };

    try {
      const pty = await this.createPty(session, request.envVars);
      instance.pty = pty;
      session.status = 'connected';

      // Set up output handling with command block detection
      this.setupOutputHandler(sessionId, pty);
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to create PTY');
      session.status = 'error';
      throw new Error(`Failed to create terminal: ${error}`);
    }

    this.terminals.set(sessionId, instance);
    return session;
  }

  private async createPty(
    session: TerminalSession,
    envVars?: Record<string, string>
  ): Promise<IPty> {
    // Dynamic import for node-pty
    const nodePty = await import('node-pty');

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: 'en_US.UTF-8',
      // AI terminal markers for command detection
      PS1: '\\[\\e]0;\\w\\a\\]\\[\\e[32m\\]➜ \\[\\e[36m\\]\\w\\[\\e[0m\\] ',
      PROMPT_COMMAND: 'echo -ne "\\033]0;${PWD}\\007"',
      ...envVars,
    };

    // Add AI API keys if available
    if (config_.ai.anthropicKey) {
      env.ANTHROPIC_API_KEY = config_.ai.anthropicKey;
    }
    if (config_.ai.openaiKey) {
      env.OPENAI_API_KEY = config_.ai.openaiKey;
    }

    const pty = nodePty.spawn(session.shell, [], {
      name: 'xterm-256color',
      cols: session.cols,
      rows: session.rows,
      cwd: session.workingDirectory || process.env.HOME || '/tmp',
      env,
    });

    logger.info({ sessionId: session.id, pid: pty.pid }, 'PTY spawned');
    return pty;
  }

  private setupOutputHandler(sessionId: string, pty: IPty): void {
    const instance = this.terminals.get(sessionId);
    if (!instance) return;

    let currentOutput = '';
    let commandStarted = false;

    pty.onData((data: string) => {
      // Store in buffer for AI context
      instance.outputBuffer.push(data);
      
      // Keep last 100KB
      let totalSize = instance.outputBuffer.reduce((acc, d) => acc + d.length, 0);
      while (totalSize > 100 * 1024 && instance.outputBuffer.length > 0) {
        const removed = instance.outputBuffer.shift()!;
        totalSize -= removed.length;
      }

      // Accumulate output for current block
      if (instance.currentBlock) {
        instance.currentBlock.output += data;
      }

      currentOutput += data;

      // Detect command completion (prompt returned)
      // This is a simplified detection - real implementation would be more sophisticated
      if (data.includes('➜') && commandStarted) {
        this.finalizeBlock(sessionId, currentOutput);
        currentOutput = '';
        commandStarted = false;
      }

      // Notify all output listeners
      const callbacks = this.outputCallbacks.get(sessionId);
      if (callbacks) {
        callbacks.forEach(cb => cb(data));
      }

      // Update last activity
      instance.session.lastActivityAt = new Date();
    });

    pty.onExit(({ exitCode }) => {
      logger.info({ sessionId, exitCode }, 'PTY exited');
      if (instance.currentBlock) {
        instance.currentBlock.exitCode = exitCode;
        instance.currentBlock.endTime = new Date();
      }
      instance.session.status = 'disconnected';
    });
  }

  private async finalizeBlock(sessionId: string, output: string): Promise<void> {
    const instance = this.terminals.get(sessionId);
    if (!instance?.currentBlock) return;

    const block = instance.currentBlock;
    block.endTime = new Date();

    // Analyze the command output for errors
    if (config_.features.commandAnalysis) {
      try {
        const analysis = await commandAnalyzer.analyzeOutput(block.command, output);
        block.analysis = analysis;

        // Notify block listeners
        const callbacks = this.blockCallbacks.get(sessionId);
        if (callbacks) {
          callbacks.forEach(cb => cb(block));
        }
      } catch (error) {
        logger.error({ error }, 'Failed to analyze command');
      }
    }

    instance.blocks.push(block);
    
    // Keep last 100 blocks
    if (instance.blocks.length > 100) {
      instance.blocks.shift();
    }

    instance.currentBlock = null;
  }

  async getSession(sessionId: string): Promise<TerminalSession | null> {
    return this.terminals.get(sessionId)?.session || null;
  }

  async listSessions(workspaceId?: string): Promise<TerminalSession[]> {
    const sessions = Array.from(this.terminals.values()).map(t => t.session);
    if (workspaceId) {
      return sessions.filter(s => s.workspaceId === workspaceId);
    }
    return sessions;
  }

  async closeSession(sessionId: string): Promise<boolean> {
    const instance = this.terminals.get(sessionId);
    if (!instance) return false;

    logger.info({ sessionId }, 'Closing terminal session');

    if (instance.pty) {
      instance.pty.kill();
    }

    this.terminals.delete(sessionId);
    this.outputCallbacks.delete(sessionId);
    this.blockCallbacks.delete(sessionId);

    return true;
  }

  async write(sessionId: string, data: string): Promise<void> {
    const instance = this.terminals.get(sessionId);
    if (!instance?.pty) {
      throw new Error(`Terminal not found: ${sessionId}`);
    }

    // Detect if this is a command (ends with newline)
    if (data.endsWith('\r') || data.endsWith('\n')) {
      const command = instance.lastCommand.trim();
      if (command) {
        // Start a new command block
        instance.currentBlock = {
          id: uuid(),
          command,
          output: '',
          exitCode: null,
          startTime: new Date(),
          endTime: null,
          cwd: process.cwd(), // Will be updated by prompt
        };
      }
      instance.lastCommand = '';
    } else {
      instance.lastCommand += data;
    }

    instance.pty.write(data);
    instance.session.lastActivityAt = new Date();
  }

  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const instance = this.terminals.get(sessionId);
    if (!instance?.pty) {
      throw new Error(`Terminal not found: ${sessionId}`);
    }

    instance.pty.resize(cols, rows);
    instance.session.cols = cols;
    instance.session.rows = rows;
  }

  onOutput(sessionId: string, callback: (data: string) => void): () => void {
    if (!this.outputCallbacks.has(sessionId)) {
      this.outputCallbacks.set(sessionId, new Set());
    }
    this.outputCallbacks.get(sessionId)!.add(callback);

    return () => {
      this.outputCallbacks.get(sessionId)?.delete(callback);
    };
  }

  onBlock(sessionId: string, callback: (block: CommandBlock) => void): () => void {
    if (!this.blockCallbacks.has(sessionId)) {
      this.blockCallbacks.set(sessionId, new Set());
    }
    this.blockCallbacks.get(sessionId)!.add(callback);

    return () => {
      this.blockCallbacks.get(sessionId)?.delete(callback);
    };
  }

  getContext(sessionId: string, maxBytes = 10000): string {
    const instance = this.terminals.get(sessionId);
    if (!instance) return '';

    let result = '';
    for (let i = instance.outputBuffer.length - 1; i >= 0 && result.length < maxBytes; i--) {
      result = instance.outputBuffer[i] + result;
    }
    return result.slice(-maxBytes);
  }

  getBlocks(sessionId: string, limit = 20): CommandBlock[] {
    const instance = this.terminals.get(sessionId);
    if (!instance) return [];
    return instance.blocks.slice(-limit);
  }

  getLastBlock(sessionId: string): CommandBlock | null {
    const instance = this.terminals.get(sessionId);
    if (!instance) return null;
    return instance.blocks[instance.blocks.length - 1] || null;
  }
}

// Singleton
export const terminalService = new TerminalService();
