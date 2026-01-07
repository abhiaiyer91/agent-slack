/**
 * Agent Runtime
 *
 * Connects agents with the Agent Slack workspace.
 * Handles message routing, tool execution, and agent lifecycle.
 * Works standalone or can be integrated with Mastra agents.
 */
import { createSlackTools } from '../tools/slack-tools.js';
/**
 * Runtime that connects Mastra agents to the workspace.
 */
export class AgentRuntime {
    workspace;
    agents = new Map();
    options;
    messageQueue = [];
    processing = false;
    constructor(workspace, options = {}) {
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
    registerAgent(id, name, config) {
        // Register in workspace
        this.workspace.registerAgent({
            id,
            name,
            description: config.description ?? '',
            capabilities: config.capabilities ?? [],
        });
        // Create Slack tools for this agent
        const tools = createSlackTools(this.workspace, id);
        const connected = {
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
    getAgent(id) {
        return this.agents.get(id);
    }
    /**
     * Handle incoming messages.
     */
    handleMessage(message, context) {
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
    async processQueue() {
        if (this.processing)
            return;
        this.processing = true;
        while (this.messageQueue.length > 0) {
            const item = this.messageQueue.shift();
            await this.processMessage(item.message, item.context);
        }
        this.processing = false;
    }
    /**
     * Process a single message.
     */
    async processMessage(message, context) {
        // Find mentioned agents that we manage
        const mentionedAgentIds = context.mentionedAgentIds;
        for (const agentId of mentionedAgentIds) {
            const connected = this.agents.get(agentId);
            if (!connected?.isActive)
                continue;
            if (this.options.debug) {
                console.log(`[Runtime] ${connected.name} was mentioned in: "${message.content.slice(0, 50)}..."`);
            }
            try {
                // Generate response using Mastra agent
                const response = await this.generateResponse(connected, message, context);
                if (response && this.options.onResponse) {
                    this.options.onResponse(agentId, response);
                }
            }
            catch (error) {
                console.error(`[Runtime] Error generating response for ${connected.name}:`, error);
            }
        }
    }
    /**
     * Generate a response from an agent.
     */
    async generateResponse(connected, triggerMessage, _context) {
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
    buildPrompt(message) {
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
    async simulateAgentResponse(connected, _prompt) {
        // Simulate thinking time
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Return a simulated response based on agent type
        const responses = {
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
    async triggerAgent(agentId, prompt, options) {
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
        }
        finally {
            this.workspace.setPresence(agentId, 'online');
        }
    }
    /**
     * Deactivate an agent.
     */
    deactivateAgent(agentId) {
        const connected = this.agents.get(agentId);
        if (connected) {
            connected.isActive = false;
            this.workspace.setPresence(agentId, 'offline');
        }
    }
    /**
     * Activate an agent.
     */
    activateAgent(agentId) {
        const connected = this.agents.get(agentId);
        if (connected) {
            connected.isActive = true;
            this.workspace.setPresence(agentId, 'online');
        }
    }
    /**
     * Get all connected agents.
     */
    listAgents() {
        return Array.from(this.agents.values());
    }
}
//# sourceMappingURL=mastra-integration.js.map