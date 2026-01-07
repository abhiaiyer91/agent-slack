/**
 * Workspace Primitive
 *
 * The top-level container for agent collaboration. A workspace contains
 * channels, manages agents, and coordinates the overall communication environment.
 */
import { EventEmitter } from 'eventemitter3';
import { Channel, ChannelType } from './channel.js';
import { Message, MessageType } from './message.js';
import { Thread, ThreadManager } from './thread.js';
import { ReactionManager } from './reaction.js';
import { PresenceManager, PresenceStatus } from './presence.js';
import { ArtifactStore } from './artifact.js';
import { MentionContext } from './mention.js';
/**
 * Configuration for a workspace.
 */
export interface WorkspaceSettings {
    maxMessageLength: number;
    allowMessageEditing: boolean;
    messageRetentionDays?: number;
    defaultChannelType: ChannelType;
    allowPublicChannels: boolean;
    requireAgentApproval: boolean;
    maxAgents?: number;
    defaultNotifications: 'all' | 'mentions' | 'none';
}
/**
 * Agent identity within a workspace.
 */
export interface WorkspaceAgent {
    id: string;
    name: string;
    description: string;
    avatarEmoji: string;
    capabilities: string[];
    joinedAt: Date;
    channelIds: string[];
}
/**
 * Events emitted by the workspace.
 */
export interface WorkspaceEvents {
    message: (message: Message, context: MentionContext) => void;
    reaction: (messageId: string, emoji: string, agentId: string) => void;
    agentJoined: (agentId: string) => void;
    agentLeft: (agentId: string) => void;
    channelCreated: (channel: Channel) => void;
    channelJoined: (channelId: string, agentId: string) => void;
    channelLeft: (channelId: string, agentId: string) => void;
    threadCreated: (thread: Thread) => void;
    presenceChanged: (agentId: string, status: PresenceStatus) => void;
}
/**
 * A workspace for agent collaboration.
 */
export declare class AgentWorkspace extends EventEmitter<WorkspaceEvents> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly iconEmoji: string;
    readonly settings: WorkspaceSettings;
    readonly createdAt: Date;
    readonly threads: ThreadManager;
    readonly reactions: ReactionManager;
    readonly presence: PresenceManager;
    readonly artifacts: ArtifactStore;
    private readonly _agents;
    private readonly _agentsByName;
    private readonly _channels;
    private readonly _channelsByName;
    constructor(name: string, options?: {
        description?: string;
        iconEmoji?: string;
        settings?: Partial<WorkspaceSettings>;
    });
    /**
     * Register an agent to the workspace.
     */
    registerAgent(agent: {
        id: string;
        name: string;
        description?: string;
        avatarEmoji?: string;
        capabilities?: string[];
    }): WorkspaceAgent;
    /**
     * Get an agent by ID.
     */
    getAgent(agentId: string): WorkspaceAgent | undefined;
    /**
     * Get an agent by name (for @mention lookup).
     */
    getAgentByName(name: string): WorkspaceAgent | undefined;
    /**
     * List all agents, optionally filtered by status.
     */
    listAgents(options?: {
        status?: PresenceStatus;
    }): WorkspaceAgent[];
    /**
     * Find all agents with a specific capability.
     */
    findAgentsByCapability(capability: string): WorkspaceAgent[];
    /**
     * Create a new channel in the workspace.
     */
    createChannel(name: string, options?: {
        purpose?: string;
        channelType?: ChannelType;
        creatorId?: string;
    }): Channel;
    /**
     * Get a channel by name or ID.
     */
    getChannel(nameOrId: string): Channel | undefined;
    /**
     * List channels in the workspace.
     */
    listChannels(options?: {
        includePrivate?: boolean;
        agentId?: string;
    }): Channel[];
    /**
     * Have an agent join a channel.
     */
    joinChannel(agentId: string, channelId: string): boolean;
    /**
     * Have an agent leave a channel.
     */
    leaveChannel(agentId: string, channelId: string): boolean;
    /**
     * Get or create a DM channel between two agents.
     */
    getDMChannel(agent1Id: string, agent2Id: string): Channel;
    /**
     * Create a group DM.
     */
    createGroupDM(agentIds: string[], name?: string): Channel;
    /**
     * Post a message to a channel.
     */
    postMessage(senderId: string, channelId: string, content: string, options?: {
        messageType?: MessageType;
        threadId?: string;
        artifactIds?: string[];
        metadata?: Record<string, unknown>;
    }): Message;
    /**
     * Reply to a message in a thread.
     */
    replyInThread(senderId: string, parentMessageId: string, content: string, options?: {
        artifactIds?: string[];
        metadata?: Record<string, unknown>;
    }): Message;
    /**
     * Add a reaction to a message.
     */
    addReaction(messageId: string, emoji: string, agentId: string): import("./reaction.js").Reaction;
    /**
     * Get messages from a channel.
     */
    getMessages(channelId: string, options?: {
        limit?: number;
        before?: Date;
        after?: Date;
    }): Message[];
    /**
     * Update agent presence.
     */
    setPresence(agentId: string, status: PresenceStatus, message?: string): import("./presence.js").Presence;
    /**
     * Get online agents.
     */
    getOnlineAgents(): WorkspaceAgent[];
    /**
     * Get available agents (online with capacity).
     */
    getAvailableAgents(): WorkspaceAgent[];
    toJSON(): {
        id: string;
        name: string;
        description: string;
        iconEmoji: string;
        agentCount: number;
        channelCount: number;
        createdAt: Date;
    };
    toString(): string;
}
//# sourceMappingURL=workspace.d.ts.map