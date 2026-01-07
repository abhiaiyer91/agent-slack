/**
 * AI Agent Runner - Run Claude Code, Codex CLI, Aider, etc.
 * 
 * This is THE killer feature. Sandterm doesn't just have AI chat -
 * it can run full AI coding agents inside sandboxes.
 */

import type { Sandterm } from '../sandterm.js';
import type { TerminalSession } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('agent-runner');

export type AgentType = 
  | 'claude-code'    // Anthropic's Claude Code
  | 'codex'          // OpenAI's Codex CLI
  | 'aider'          // Aider AI coding assistant
  | 'cursor'         // Cursor's agent mode
  | 'continue'       // Continue.dev
  | 'custom';

export interface AgentConfig {
  type: AgentType;
  apiKey?: string;
  model?: string;
  autoApprove?: boolean;
  workingDir?: string;
  env?: Record<string, string>;
}

export interface AgentSession {
  id: string;
  agent: AgentType;
  sandboxId: string;
  terminalSession: TerminalSession;
  status: 'starting' | 'running' | 'paused' | 'stopped' | 'error';
  startedAt: Date;
}

// Installation commands for each agent
const AGENT_INSTALL: Record<AgentType, string> = {
  'claude-code': 'npm install -g @anthropic-ai/claude-code',
  'codex': 'npm install -g @openai/codex',
  'aider': 'pip install aider-chat',
  'cursor': 'echo "Cursor agent requires Cursor IDE"',
  'continue': 'echo "Continue requires IDE extension"',
  'custom': 'echo "Custom agent"',
};

// Start commands for each agent
const AGENT_START: Record<AgentType, (config: AgentConfig) => string> = {
  'claude-code': (cfg) => {
    const parts = ['claude'];
    if (cfg.workingDir) parts.push(`--cwd ${cfg.workingDir}`);
    if (cfg.autoApprove) parts.push('--yes');
    return parts.join(' ');
  },
  'codex': (cfg) => {
    const parts = ['codex'];
    if (cfg.workingDir) parts.push(`--cwd ${cfg.workingDir}`);
    if (cfg.autoApprove) parts.push('--auto-approve');
    return parts.join(' ');
  },
  'aider': (cfg) => {
    const parts = ['aider'];
    if (cfg.model) parts.push(`--model ${cfg.model}`);
    if (cfg.autoApprove) parts.push('--yes');
    return parts.join(' ');
  },
  'cursor': () => 'echo "Start Cursor in agent mode"',
  'continue': () => 'echo "Start Continue in agent mode"',
  'custom': () => 'bash',
};

export class AgentRunner {
  private sessions: Map<string, AgentSession> = new Map();

  constructor(private sandterm: Sandterm) {}

  /**
   * Check if an agent is available in the sandbox
   */
  async isAgentInstalled(sandboxId: string, agent: AgentType): Promise<boolean> {
    const checkCommands: Record<AgentType, string> = {
      'claude-code': 'which claude',
      'codex': 'which codex',
      'aider': 'which aider',
      'cursor': 'echo "check IDE"',
      'continue': 'echo "check IDE"',
      'custom': 'true',
    };

    try {
      // Create a temporary session to check
      const session = await this.sandterm.createSession(sandboxId);
      
      return new Promise((resolve) => {
        let output = '';
        const unsub = this.sandterm.on(session.id, (event) => {
          if (event.type === 'output') {
            output += event.data;
            // If we get a path, it's installed
            if (output.includes('/') && !output.includes('not found')) {
              unsub();
              this.sandterm.closeSession(session.id);
              resolve(true);
            }
          }
        });

        this.sandterm.writeToSession(session.id, checkCommands[agent] + '\n');
        
        // Timeout after 3 seconds
        setTimeout(() => {
          unsub();
          this.sandterm.closeSession(session.id);
          resolve(false);
        }, 3000);
      });
    } catch {
      return false;
    }
  }

  /**
   * Install an agent in the sandbox
   */
  async installAgent(sandboxId: string, agent: AgentType): Promise<void> {
    logger.info({ sandboxId, agent }, 'Installing agent');
    
    const session = await this.sandterm.createSession(sandboxId);
    const installCmd = AGENT_INSTALL[agent];
    
    await this.sandterm.writeToSession(session.id, installCmd + '\n');
    
    // Wait for installation
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await this.sandterm.closeSession(session.id);
  }

  /**
   * Start an AI agent in a sandbox
   */
  async startAgent(sandboxId: string, config: AgentConfig): Promise<AgentSession> {
    logger.info({ sandboxId, agent: config.type }, 'Starting AI agent');

    // Check if installed
    const installed = await this.isAgentInstalled(sandboxId, config.type);
    if (!installed && config.type !== 'custom') {
      logger.info({ agent: config.type }, 'Agent not installed, installing...');
      await this.installAgent(sandboxId, config.type);
    }

    // Create terminal session with agent environment
    const env: Record<string, string> = { ...config.env };
    
    // Set API keys
    if (config.apiKey) {
      if (config.type === 'claude-code') {
        env.ANTHROPIC_API_KEY = config.apiKey;
      } else if (config.type === 'codex') {
        env.OPENAI_API_KEY = config.apiKey;
      } else if (config.type === 'aider') {
        env.ANTHROPIC_API_KEY = config.apiKey;
        env.OPENAI_API_KEY = config.apiKey;
      }
    }

    const terminalSession = await this.sandterm.createSession(sandboxId, {
      cwd: config.workingDir,
      env,
    });

    const agentSession: AgentSession = {
      id: terminalSession.id,
      agent: config.type,
      sandboxId,
      terminalSession,
      status: 'starting',
      startedAt: new Date(),
    };

    this.sessions.set(agentSession.id, agentSession);

    // Start the agent
    const startCmd = AGENT_START[config.type](config);
    await this.sandterm.writeToSession(terminalSession.id, startCmd + '\n');
    
    agentSession.status = 'running';
    logger.info({ sessionId: agentSession.id, agent: config.type }, 'Agent started');

    return agentSession;
  }

  /**
   * Send a prompt to the running agent
   */
  async sendPrompt(sessionId: string, prompt: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Agent session not found: ${sessionId}`);
    if (session.status !== 'running') throw new Error(`Agent not running: ${session.status}`);

    await this.sandterm.writeToSession(sessionId, prompt + '\n');
  }

  /**
   * Stop an agent session
   */
  async stopAgent(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    logger.info({ sessionId, agent: session.agent }, 'Stopping agent');

    // Send Ctrl+C to stop the agent
    await this.sandterm.writeToSession(sessionId, '\x03');
    
    // Close the terminal session
    await this.sandterm.closeSession(sessionId);
    
    session.status = 'stopped';
    this.sessions.delete(sessionId);
  }

  /**
   * Get all active agent sessions
   */
  listSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): AgentSession | null {
    return this.sessions.get(sessionId) || null;
  }
}
