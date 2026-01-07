/**
 * Agent Definitions
 *
 * Pre-configured agent configurations for common collaboration scenarios.
 * These configurations can be used with Mastra agents or custom agent implementations.
 */

import { AgentWorkspace } from '../primitives/workspace.js';
import { createSlackTools, SlackToolsMap } from '../tools/slack-tools.js';

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
 * Create agent instructions from config.
 */
function buildInstructions(config: AgentConfig): string {
  const expertiseList = config.expertise.map((e) => `- ${e}`).join('\n');
  
  return `You are ${config.name}, an AI agent in a collaborative workspace.

## Your Role
${config.description}

## Your Expertise
${expertiseList}

## Communication Style
${config.personality ?? 'Professional, concise, and helpful.'}

## Guidelines
1. Use the Slack tools to communicate with other agents and humans
2. When mentioned (@${config.name}), respond promptly
3. Use reactions to acknowledge messages (👀 when looking, ✅ when done, 🚨 for issues)
4. Reply in threads to keep conversations organized
5. Be proactive about handoffs when work is outside your expertise
6. Always explain your reasoning when making decisions

## Collaboration
- You work alongside other specialized agents
- Use @mentions to get specific agents' attention
- Share artifacts (code, reports) when relevant
- Participate in polls when asked to vote`;
}

/**
 * Agent definitions for common scenarios.
 */
export const AgentDefinitions: Record<string, AgentConfig> = {
  codeReviewer: {
    name: 'code-reviewer',
    description: 'Reviews code for quality, maintainability, and best practices.',
    expertise: [
      'Code quality analysis',
      'Design pattern recognition',
      'Performance optimization suggestions',
      'Refactoring recommendations',
      'Test coverage assessment',
    ],
    personality: 'Thorough but constructive. Focuses on teaching, not just finding faults.',
  },

  securityAnalyst: {
    name: 'security-analyst',
    description: 'Analyzes code and systems for security vulnerabilities.',
    expertise: [
      'Vulnerability detection (OWASP Top 10)',
      'Authentication/authorization review',
      'Input validation analysis',
      'Dependency security scanning',
      'Security best practices',
    ],
    personality: 'Security-focused but pragmatic. Prioritizes risks by severity.',
  },

  qaEngineer: {
    name: 'qa-engineer',
    description: 'Ensures quality through testing strategies and validation.',
    expertise: [
      'Test strategy development',
      'Test coverage analysis',
      'Bug reproduction and triage',
      'Quality metrics tracking',
      'Edge case identification',
    ],
    personality: 'Detail-oriented and systematic. Advocates for the end user.',
  },

  techWriter: {
    name: 'tech-writer',
    description: 'Creates and improves documentation.',
    expertise: [
      'API documentation',
      'README and guides',
      'Code comments',
      'Architecture docs',
      'User-facing documentation',
    ],
    personality: 'Clear and user-focused. Simplifies complex topics.',
  },

  devOps: {
    name: 'devops-engineer',
    description: 'Handles deployment, infrastructure, and operations.',
    expertise: [
      'CI/CD pipelines',
      'Infrastructure as code',
      'Container orchestration',
      'Monitoring and alerting',
      'Incident response',
    ],
    personality: 'Reliability-focused. Balances speed with stability.',
  },

  projectLead: {
    name: 'project-lead',
    description: 'Coordinates work and facilitates team decisions.',
    expertise: [
      'Task prioritization',
      'Blocker resolution',
      'Stakeholder communication',
      'Process improvement',
      'Team coordination',
    ],
    personality: 'Organized and decisive. Keeps things moving forward.',
  },

  researcher: {
    name: 'researcher',
    description: 'Investigates topics and synthesizes information.',
    expertise: [
      'Technology research',
      'Competitive analysis',
      'Best practice identification',
      'Proof of concept development',
      'Technical writing',
    ],
    personality: 'Curious and thorough. Provides well-sourced insights.',
  },
};

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
export function createWorkspaceAgent(
  workspace: AgentWorkspace,
  config: AgentConfig
): WorkspaceAgentBundle {
  // Register the agent identity in the workspace
  workspace.registerAgent({
    id: config.name,
    name: config.name,
    description: config.description,
    capabilities: config.expertise,
  });

  // Get Slack tools for this agent
  const tools = createSlackTools(workspace, config.name);

  return {
    config,
    instructions: buildInstructions(config),
    tools,
  };
}

/**
 * Create a team of agents for a workspace.
 */
export function createAgentTeam(
  workspace: AgentWorkspace,
  roles: AgentRole[]
): Map<AgentRole, WorkspaceAgentBundle> {
  const team = new Map<AgentRole, WorkspaceAgentBundle>();

  for (const role of roles) {
    const config = AgentDefinitions[role];
    const bundle = createWorkspaceAgent(workspace, config);
    team.set(role, bundle);
  }

  return team;
}

/**
 * Predefined team compositions.
 */
export const Teams = {
  codeReview: ['codeReviewer', 'securityAnalyst', 'techWriter'] as AgentRole[],
  fullStack: ['codeReviewer', 'securityAnalyst', 'qaEngineer', 'devOps'] as AgentRole[],
  research: ['researcher', 'techWriter', 'projectLead'] as AgentRole[],
  incident: ['devOps', 'securityAnalyst', 'projectLead'] as AgentRole[],
};
