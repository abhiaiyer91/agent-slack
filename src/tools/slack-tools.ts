/**
 * Mastra Tool Definitions for Agent Slack
 *
 * These tools allow Mastra agents to interact with the Agent Slack workspace.
 * They provide a natural interface for agents to send messages, react, mention
 * other agents, and coordinate work.
 */

import { createTool } from '@mastra/core';
import { z } from 'zod';
import type { AgentWorkspace } from '../primitives/workspace.js';
import { MessageType } from '../primitives/message.js';

// Using unknown for flexibility with Mastra's complex tool types
export type SlackToolsMap = Record<string, unknown>;

/**
 * Create a set of Slack tools for an agent.
 * @returns An object containing all Slack tools for the agent.
 */
export function createSlackTools(workspace: AgentWorkspace, agentId: string): SlackToolsMap {
  // ==================== Messaging Tools ====================

  const postMessage = createTool({
    id: 'postMessage',
    description: 'Send a message to a channel. Use this to communicate with other agents or share updates.',
    inputSchema: z.object({
      channel: z.string().describe('The channel name (e.g., "general", "code-reviews") or channel ID'),
      content: z.string().describe('The message content. Can include @mentions like @agent-name'),
      messageType: z.enum(['text', 'request', 'response', 'status_update']).optional()
        .describe('The type of message. Defaults to "text"'),
    }),
    outputSchema: z.object({
      messageId: z.string(),
      channelId: z.string(),
      timestamp: z.string(),
    }),
    execute: async ({ context }) => {
      const channel = workspace.getChannel(context.channel);
      if (!channel) {
        throw new Error(`Channel "${context.channel}" not found`);
      }

      const message = workspace.postMessage(
        agentId,
        channel.id,
        context.content,
        { messageType: (context.messageType as MessageType) ?? MessageType.TEXT }
      );

      return {
        messageId: message.id,
        channelId: channel.id,
        timestamp: message.createdAt.toISOString(),
      };
    },
  });

  const replyInThread = createTool({
    id: 'replyInThread',
    description: 'Reply to a message in a thread. Use this for focused discussions on a specific topic.',
    inputSchema: z.object({
      parentMessageId: z.string().describe('The ID of the message to reply to'),
      content: z.string().describe('The reply content'),
    }),
    outputSchema: z.object({
      messageId: z.string(),
      threadId: z.string(),
      timestamp: z.string(),
    }),
    execute: async ({ context }) => {
      const reply = workspace.replyInThread(
        agentId,
        context.parentMessageId,
        context.content
      );

      return {
        messageId: reply.id,
        threadId: reply.threadId!,
        timestamp: reply.createdAt.toISOString(),
      };
    },
  });

  const getChannelHistory = createTool({
    id: 'getChannelHistory',
    description: 'Read recent messages from a channel to understand the conversation context.',
    inputSchema: z.object({
      channel: z.string().describe('The channel name or ID'),
      limit: z.number().optional().describe('Maximum number of messages to retrieve (default: 20)'),
    }),
    outputSchema: z.object({
      channelName: z.string(),
      messages: z.array(z.object({
        id: z.string(),
        sender: z.string(),
        content: z.string(),
        timestamp: z.string(),
        threadId: z.string().optional(),
        reactionCount: z.number(),
      })),
    }),
    execute: async ({ context }) => {
      const channel = workspace.getChannel(context.channel);
      if (!channel) {
        throw new Error(`Channel "${context.channel}" not found`);
      }

      const messages = workspace.getMessages(channel.id, { limit: context.limit ?? 20 });

      return {
        channelName: channel.name,
        messages: messages.map((m) => ({
          id: m.id,
          sender: m.senderId,
          content: m.content,
          timestamp: m.createdAt.toISOString(),
          threadId: m.threadId,
          reactionCount: workspace.reactions.getReactions(m.id).totalCount,
        })),
      };
    },
  });

  // ==================== Reaction Tools ====================

  const addReaction = createTool({
    id: 'addReaction',
    description: 'Add a reaction to a message. Use semantic reactions to communicate status: "eyes" (👀 looking), "thumbsup" (👍 approved), "white_check_mark" (✅ done), "hourglass" (⏳ working on it), "rotating_light" (🚨 urgent problem).',
    inputSchema: z.object({
      messageId: z.string().describe('The ID of the message to react to'),
      emoji: z.string().describe('The reaction emoji code (e.g., "thumbsup", "eyes", "white_check_mark")'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      emoji: z.string(),
      displayEmoji: z.string(),
    }),
    execute: async ({ context }) => {
      const reaction = workspace.addReaction(context.messageId, context.emoji, agentId);
      return {
        success: true,
        emoji: reaction.emoji,
        displayEmoji: reaction.displayEmoji,
      };
    },
  });

  // ==================== Channel Tools ====================

  const listChannels = createTool({
    id: 'listChannels',
    description: 'List available channels in the workspace.',
    inputSchema: z.object({
      includePrivate: z.boolean().optional().describe('Include private channels the agent has access to'),
    }),
    outputSchema: z.object({
      channels: z.array(z.object({
        id: z.string(),
        name: z.string(),
        purpose: z.string(),
        memberCount: z.number(),
        unreadCount: z.number(),
      })),
    }),
    execute: async ({ context }) => {
      const channels = workspace.listChannels({
        includePrivate: context.includePrivate ?? false,
        agentId,
      });

      return {
        channels: channels.map((c) => ({
          id: c.id,
          name: c.name,
          purpose: c.purpose,
          memberCount: c.memberCount,
          unreadCount: c.getUnreadCount(agentId),
        })),
      };
    },
  });

  const joinChannel = createTool({
    id: 'joinChannel',
    description: 'Join a channel to participate in conversations.',
    inputSchema: z.object({
      channel: z.string().describe('The channel name or ID to join'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      channelName: z.string(),
      memberCount: z.number(),
    }),
    execute: async ({ context }) => {
      const channel = workspace.getChannel(context.channel);
      if (!channel) {
        throw new Error(`Channel "${context.channel}" not found`);
      }

      workspace.joinChannel(agentId, channel.id);

      return {
        success: true,
        channelName: channel.name,
        memberCount: channel.memberCount,
      };
    },
  });

  // ==================== Agent Discovery Tools ====================

  const listAgents = createTool({
    id: 'listAgents',
    description: 'List agents in the workspace. Use this to discover who you can collaborate with.',
    inputSchema: z.object({
      capability: z.string().optional().describe('Filter by capability (e.g., "code_review", "security_scan")'),
      onlineOnly: z.boolean().optional().describe('Only show online agents'),
    }),
    outputSchema: z.object({
      agents: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        capabilities: z.array(z.string()),
        status: z.string(),
        isAvailable: z.boolean(),
      })),
    }),
    execute: async ({ context }) => {
      let agents = context.capability
        ? workspace.findAgentsByCapability(context.capability)
        : workspace.listAgents();

      if (context.onlineOnly) {
        const onlineIds = new Set(workspace.presence.getOnlineAgents());
        agents = agents.filter((a) => onlineIds.has(a.id));
      }

      return {
        agents: agents.map((a) => {
          const presence = workspace.presence.get(a.id);
          return {
            id: a.id,
            name: a.name,
            description: a.description,
            capabilities: a.capabilities,
            status: presence?.effectiveStatus ?? 'offline',
            isAvailable: presence?.isAvailable ?? false,
          };
        }),
      };
    },
  });

  const sendDirectMessage = createTool({
    id: 'sendDirectMessage',
    description: 'Send a direct message to another agent.',
    inputSchema: z.object({
      toAgent: z.string().describe('The name or ID of the agent to message'),
      content: z.string().describe('The message content'),
    }),
    outputSchema: z.object({
      messageId: z.string(),
      dmChannelId: z.string(),
    }),
    execute: async ({ context }) => {
      // Find the target agent
      let targetAgent = workspace.getAgent(context.toAgent);
      if (!targetAgent) {
        targetAgent = workspace.getAgentByName(context.toAgent);
      }
      if (!targetAgent) {
        throw new Error(`Agent "${context.toAgent}" not found`);
      }

      // Get or create DM channel
      const dmChannel = workspace.getDMChannel(agentId, targetAgent.id);

      // Ensure both agents are members
      if (!dmChannel.isMember(agentId)) {
        dmChannel.addMember(agentId);
      }

      // Post the message
      const message = workspace.postMessage(agentId, dmChannel.id, context.content);

      return {
        messageId: message.id,
        dmChannelId: dmChannel.id,
      };
    },
  });

  // ==================== Task Tools ====================

  const createTask = createTool({
    id: 'createTask',
    description: 'Create a task and optionally assign it to an agent.',
    inputSchema: z.object({
      title: z.string().describe('The task title'),
      description: z.string().optional().describe('Detailed description of the task'),
      assignTo: z.string().optional().describe('Agent name or ID to assign the task to'),
      priority: z.enum(['critical', 'high', 'medium', 'low', 'background']).optional()
        .describe('Task priority level'),
      channelId: z.string().optional().describe('Channel to associate the task with'),
    }),
    outputSchema: z.object({
      taskId: z.string(),
      title: z.string(),
      status: z.string(),
      assignedTo: z.string().optional(),
    }),
    execute: async ({ context }) => {
      // We need to access task manager - for now, we'll store in workspace metadata
      // In a real implementation, workspace would have a taskManager property
      
      // For demonstration, we'll post a task creation message
      const channelId = context.channelId ?? workspace.getChannel('general')?.id;
      if (!channelId) {
        throw new Error('No channel available for task');
      }

      const assignee = context.assignTo
        ? (workspace.getAgent(context.assignTo) ?? workspace.getAgentByName(context.assignTo))
        : undefined;

      const taskMessage = `📋 **New Task**: ${context.title}
${context.description ? `\n${context.description}` : ''}
Priority: ${context.priority ?? 'medium'}
${assignee ? `Assigned to: @${assignee.name}` : 'Unassigned'}`;

      const message = workspace.postMessage(agentId, channelId, taskMessage, {
        messageType: MessageType.REQUEST,
        metadata: {
          taskTitle: context.title,
          taskPriority: context.priority ?? 'medium',
          assignedTo: assignee?.id,
        },
      });

      return {
        taskId: message.id, // Using message ID as task ID for demo
        title: context.title,
        status: assignee ? 'assigned' : 'pending',
        assignedTo: assignee?.name,
      };
    },
  });

  // ==================== Handoff Tools ====================

  const handoffWork = createTool({
    id: 'handoffWork',
    description: 'Hand off work to another agent with context. Use this when you need help or when passing work to the next step.',
    inputSchema: z.object({
      toAgent: z.string().optional().describe('Specific agent to hand off to (name or ID)'),
      toCapability: z.string().optional().describe('Hand off to any agent with this capability'),
      reason: z.enum([
        'capability_needed', 'better_suited', 'at_capacity', 'load_balancing',
        'next_step', 'review_needed', 'approval_needed',
        'stuck', 'error', 'escalation', 'completed',
      ]).describe('Why the work is being handed off'),
      summary: z.string().describe('Brief summary of the work being handed off'),
      background: z.string().optional().describe('Background context'),
      currentState: z.string().optional().describe('Current state of the work'),
      expectedOutcome: z.string().optional().describe('What the expected outcome is'),
      channelId: z.string().optional().describe('Channel where the handoff should be posted'),
      isUrgent: z.boolean().optional().describe('Whether this is urgent'),
    }),
    outputSchema: z.object({
      handoffId: z.string(),
      toAgent: z.string().optional(),
      toCapability: z.string().optional(),
      messageId: z.string(),
    }),
    execute: async ({ context }) => {
      if (!context.toAgent && !context.toCapability) {
        throw new Error('Must specify either toAgent or toCapability');
      }

      const targetAgent = context.toAgent
        ? (workspace.getAgent(context.toAgent) ?? workspace.getAgentByName(context.toAgent))
        : undefined;

      const channelId = context.channelId ?? workspace.getChannel('general')?.id;
      if (!channelId) {
        throw new Error('No channel available for handoff');
      }

      const urgent = context.isUrgent ? '🚨 **URGENT** ' : '';
      const target = targetAgent ? `@${targetAgent.name}` : `[${context.toCapability}]`;
      
      const handoffMessage = `${urgent}📤 **Handoff Request** to ${target}

**Reason**: ${context.reason}

**Summary**: ${context.summary}
${context.background ? `\n**Background**: ${context.background}` : ''}
${context.currentState ? `\n**Current State**: ${context.currentState}` : ''}
${context.expectedOutcome ? `\n**Expected Outcome**: ${context.expectedOutcome}` : ''}

Please react with 👀 to acknowledge or ❌ to decline.`;

      const message = workspace.postMessage(agentId, channelId, handoffMessage, {
        messageType: MessageType.REQUEST,
        metadata: {
          handoffReason: context.reason,
          toAgent: targetAgent?.id,
          toCapability: context.toCapability,
          isUrgent: context.isUrgent ?? false,
        },
      });

      return {
        handoffId: message.id,
        toAgent: targetAgent?.name,
        toCapability: context.toCapability,
        messageId: message.id,
      };
    },
  });

  // ==================== Presence Tools ====================

  const setPresence = createTool({
    id: 'setPresence',
    description: 'Update your presence status to let other agents know your availability.',
    inputSchema: z.object({
      status: z.enum(['online', 'busy', 'away', 'dnd']).describe('Your availability status'),
      message: z.string().optional().describe('Optional status message'),
    }),
    outputSchema: z.object({
      status: z.string(),
      message: z.string(),
    }),
    execute: async ({ context }) => {
      const presence = workspace.setPresence(
        agentId,
        context.status as 'online' | 'busy' | 'away' | 'dnd',
        context.message ?? ''
      );

      return {
        status: presence.status,
        message: presence.statusMessage,
      };
    },
  });

  return {
    postMessage,
    replyInThread,
    getChannelHistory,
    addReaction,
    listChannels,
    joinChannel,
    listAgents,
    sendDirectMessage,
    createTask,
    handoffWork,
    setPresence,
  };
}

/**
 * Get an array of all Slack tools for registering with Mastra.
 */
export function getSlackToolsArray(workspace: AgentWorkspace, agentId: string): unknown[] {
  const tools = createSlackTools(workspace, agentId);
  return Object.values(tools);
}
