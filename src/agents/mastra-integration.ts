/**
 * Agent Runtime
 *
 * Connects agents with the Agent Slack workspace.
 * Handles message routing, tool execution, and agent lifecycle.
 * Works standalone or can be integrated with Mastra agents.
 */

import { AgentWorkspace } from '../primitives/workspace.js';
import { Message } from '../primitives/message.js';
import { MentionContext } from '../primitives/mention.js';
import { createSlackTools, SlackToolsMap } from '../tools/slack-tools.js';

/**
 * A connected agent that can participate in the workspace.
 */
export interface ConnectedAgent {
  id: string;
  name: string;
  instructions: string;
  tools: SlackToolsMap;
  isActive: boolean;
}

/**
 * Options for the agent runtime.
 */
export interface RuntimeOptions {
  /** Automatically respond when mentioned */
  autoRespond?: boolean;
  /** Log agent activity */
  debug?: boolean;
  /** Custom response handler */
  onResponse?: (agentId: string, response: string) => void;
}

/**
 * Runtime that connects Mastra agents to the workspace.
 */
export class AgentRuntime {
  readonly workspace: AgentWorkspace;
  private readonly agents: Map<string, ConnectedAgent> = new Map();
  private readonly options: RuntimeOptions;
  private readonly messageQueue: Array<{ message: Message; context: MentionContext }> = [];
  private processing = false;

  constructor(workspace: AgentWorkspace, options: RuntimeOptions = {}) {
    this.workspace = workspace;
    this.options = {
      autoRespond: true,
      debug: false,
      ...options,
    };

    // Listen for messages
    this.workspace.on('message', (message, context) => {
      this.handleMessage(message, context);
    });
  }

  /**
   * Register an agent with the runtime.
   */
  registerAgent(
    id: string,
    name: string,
    config: {
      description?: string;
      instructions: string;
      capabilities?: string[];
    }
  ): ConnectedAgent {
    // Register in workspace
    this.workspace.registerAgent({
      id,
      name,
      description: config.description ?? '',
      capabilities: config.capabilities ?? [],
    });

    // Create Slack tools for this agent
    const tools = createSlackTools(this.workspace, id);

    const connected: ConnectedAgent = {
      id,
      name,
      instructions: config.instructions,
      tools,
      isActive: true,
    };

    this.agents.set(id, connected);
    this.workspace.setPresence(id, 'online');

    if (this.options.debug) {
      console.log(`[Runtime] Registered agent: ${name}`);
    }

    return connected;
  }

  /**
   * Get a connected agent.
   */
  getAgent(id: string): ConnectedAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Handle incoming messages.
   */
  private handleMessage(message: Message, context: MentionContext): void {
    // Queue the message
    this.messageQueue.push({ message, context });

    // Process if not already processing
    if (!this.processing && this.options.autoRespond) {
      this.processQueue();
    }
  }

  /**
   * Process queued messages.
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.messageQueue.length > 0) {
      const item = this.messageQueue.shift()!;
      await this.processMessage(item.message, item.context);
    }

    this.processing = false;
  }

  /**
   * Process a single message.
   */
  private async processMessage(message: Message, context: MentionContext): Promise<void> {
    // Find mentioned agents that we manage
    const mentionedAgentIds = context.mentionedAgentIds;

    for (const agentId of mentionedAgentIds) {
      const connected = this.agents.get(agentId);
      if (!connected?.isActive) continue;

      if (this.options.debug) {
        console.log(`[Runtime] ${connected.name} was mentioned in: "${message.content.slice(0, 50)}..."`);
      }

      try {
        // Generate response using Mastra agent
        const response = await this.generateResponse(connected, message, context);

        if (response && this.options.onResponse) {
          this.options.onResponse(agentId, response);
        }
      } catch (error) {
        console.error(`[Runtime] Error generating response for ${connected.name}:`, error);
      }
    }
  }

  /**
   * Generate a response from an agent.
   */
  async generateResponse(
    connected: ConnectedAgent,
    triggerMessage: Message,
    _context: MentionContext
  ): Promise<string | null> {
    // Build the prompt for the agent
    const prompt = this.buildPrompt(triggerMessage);

    if (this.options.debug) {
      console.log(`[Runtime] Generating response for ${connected.name}...`);
    }

    // Use Mastra agent to generate response
    // Note: In a real implementation, this would call agent.generate()
    // For now, we'll simulate the response
    const response = await this.simulateAgentResponse(connected, prompt);

    return response;
  }

  /**
   * Build a prompt for the agent.
   */
  private buildPrompt(message: Message): string {
    // Get recent channel history for context
    const recentMessages = this.workspace.getMessages(message.channelId, { limit: 10 });

    const history = recentMessages
      .map((m) => `[${m.senderId}]: ${m.content}`)
      .join('\n');

    return `Recent conversation:
${history}

You were mentioned in the latest message. Please respond appropriately using the available tools.`;
  }

  /**
   * Simulate agent response (for demo without API keys).
   */
  private async simulateAgentResponse(
    connected: ConnectedAgent,
    _prompt: string
  ): Promise<string> {
    // Simulate thinking time
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return a simulated response based on agent type
    const responses: Record<string, string> = {
      'code-reviewer': '👀 Looking at the code now. I\'ll check for quality issues and best practices.',
      'security-analyst': '🔒 Starting security review. Will check for vulnerabilities and auth issues.',
      'qa-engineer': '🧪 Reviewing test coverage and quality metrics.',
      'tech-writer': '📝 I\'ll review the documentation and suggest improvements.',
      'devops-engineer': '🔧 Checking deployment readiness and infrastructure.',
      'project-lead': '📋 I\'ll coordinate the team and track progress.',
      'researcher': '🔍 Researching the topic. Will share findings shortly.',
    };

    return responses[connected.name] ?? `Acknowledged. Working on it.`;
  }

  /**
   * Manually trigger an agent to respond.
   */
  async triggerAgent(
    agentId: string,
    prompt: string,
    options?: { channelId?: string }
  ): Promise<string | null> {
    const connected = this.agents.get(agentId);
    if (!connected?.isActive) {
      return null;
    }

    this.workspace.setPresence(agentId, 'busy', 'Processing...');

    try {
      const response = await this.simulateAgentResponse(connected, prompt);

      // Post response to channel if specified
      if (options?.channelId) {
        this.workspace.postMessage(agentId, options.channelId, response);
      }

      return response;
    } finally {
      this.workspace.setPresence(agentId, 'online');
    }
  }

  /**
   * Deactivate an agent.
   */
  deactivateAgent(agentId: string): void {
    const connected = this.agents.get(agentId);
    if (connected) {
      connected.isActive = false;
      this.workspace.setPresence(agentId, 'offline');
    }
  }

  /**
   * Activate an agent.
   */
  activateAgent(agentId: string): void {
    const connected = this.agents.get(agentId);
    if (connected) {
      connected.isActive = true;
      this.workspace.setPresence(agentId, 'online');
    }
  }

  /**
   * Get all connected agents.
   */
  listAgents(): ConnectedAgent[] {
    return Array.from(this.agents.values());
  }
}
