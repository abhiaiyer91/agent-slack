/**
 * Agent Definitions
 *
 * Pre-configured agent configurations for common collaboration scenarios.
 * These configurations can be used with Mastra agents or custom agent implementations.
 */
import { AgentWorkspace } from '../primitives/workspace.js';
import { SlackToolsMap } from '../tools/slack-tools.js';
/**
 * Configuration for creating a workspace agent.
 */
export interface AgentConfig {
    name: string;
    description: string;
    expertise: string[];
    personality?: string;
    model?: {
        provider: 'openai' | 'anthropic';
        name: string;
    };
}
/**
 * Agent definitions for common scenarios.
 */
export declare const AgentDefinitions: Record<string, AgentConfig>;
export type AgentRole = 'codeReviewer' | 'securityAnalyst' | 'qaEngineer' | 'techWriter' | 'devOps' | 'projectLead' | 'researcher';
/**
 * A workspace agent with its configuration and tools.
 */
export interface WorkspaceAgentBundle {
    config: AgentConfig;
    instructions: string;
    tools: SlackToolsMap;
}
/**
 * Create a workspace agent bundle with tools and instructions.
 * This can be used to create a Mastra Agent or custom agent.
 */
export declare function createWorkspaceAgent(workspace: AgentWorkspace, config: AgentConfig): WorkspaceAgentBundle;
/**
 * Create a team of agents for a workspace.
 */
export declare function createAgentTeam(workspace: AgentWorkspace, roles: AgentRole[]): Map<AgentRole, WorkspaceAgentBundle>;
/**
 * Predefined team compositions.
 */
export declare const Teams: {
    codeReview: AgentRole[];
    fullStack: AgentRole[];
    research: AgentRole[];
    incident: AgentRole[];
};
//# sourceMappingURL=index.d.ts.map