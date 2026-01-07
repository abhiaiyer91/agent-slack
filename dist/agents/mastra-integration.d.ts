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
import { SlackToolsMap } from '../tools/slack-tools.js';
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
export declare class AgentRuntime {
    readonly workspace: AgentWorkspace;
    private readonly agents;
    private readonly options;
    private readonly messageQueue;
    private processing;
    constructor(workspace: AgentWorkspace, options?: RuntimeOptions);
    /**
     * Register an agent with the runtime.
     */
    registerAgent(id: string, name: string, config: {
        description?: string;
        instructions: string;
        capabilities?: string[];
    }): ConnectedAgent;
    /**
     * Get a connected agent.
     */
    getAgent(id: string): ConnectedAgent | undefined;
    /**
     * Handle incoming messages.
     */
    private handleMessage;
    /**
     * Process queued messages.
     */
    private processQueue;
    /**
     * Process a single message.
     */
    private processMessage;
    /**
     * Generate a response from an agent.
     */
    generateResponse(connected: ConnectedAgent, triggerMessage: Message, _context: MentionContext): Promise<string | null>;
    /**
     * Build a prompt for the agent.
     */
    private buildPrompt;
    /**
     * Simulate agent response (for demo without API keys).
     */
    private simulateAgentResponse;
    /**
     * Manually trigger an agent to respond.
     */
    triggerAgent(agentId: string, prompt: string, options?: {
        channelId?: string;
    }): Promise<string | null>;
    /**
     * Deactivate an agent.
     */
    deactivateAgent(agentId: string): void;
    /**
     * Activate an agent.
     */
    activateAgent(agentId: string): void;
    /**
     * Get all connected agents.
     */
    listAgents(): ConnectedAgent[];
}
//# sourceMappingURL=mastra-integration.d.ts.map