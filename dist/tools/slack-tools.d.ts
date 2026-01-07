/**
 * Mastra Tool Definitions for Agent Slack
 *
 * These tools allow Mastra agents to interact with the Agent Slack workspace.
 * They provide a natural interface for agents to send messages, react, mention
 * other agents, and coordinate work.
 */
import type { AgentWorkspace } from '../primitives/workspace.js';
export type SlackToolsMap = Record<string, unknown>;
/**
 * Create a set of Slack tools for an agent.
 * @returns An object containing all Slack tools for the agent.
 */
export declare function createSlackTools(workspace: AgentWorkspace, agentId: string): SlackToolsMap;
/**
 * Get an array of all Slack tools for registering with Mastra.
 */
export declare function getSlackToolsArray(workspace: AgentWorkspace, agentId: string): unknown[];
//# sourceMappingURL=slack-tools.d.ts.map