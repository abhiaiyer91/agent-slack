/**
 * Workspace Primitive
 *
 * The top-level container for agent collaboration. A workspace contains
 * channels, manages agents, and coordinates the overall communication environment.
 */
import { nanoid } from 'nanoid';
import { EventEmitter } from 'eventemitter3';
import { Channel, ChannelType, createDMChannel, createGroupDM } from './channel.js';
import { Message, MessageType } from './message.js';
import { ThreadManager } from './thread.js';
import { ReactionManager } from './reaction.js';
import { PresenceManager } from './presence.js';
import { ArtifactStore } from './artifact.js';
import { parseMentions, MentionContext } from './mention.js';
const DEFAULT_SETTINGS = {
    maxMessageLength: 40000,
    allowMessageEditing: true,
    defaultChannelType: ChannelType.PUBLIC,
    allowPublicChannels: true,
    requireAgentApproval: false,
    defaultNotifications: 'mentions',
};
/**
 * A workspace for agent collaboration.
 */
export class AgentWorkspace extends EventEmitter {
    id;
    name;
    description;
    iconEmoji;
    settings;
    createdAt;
    // Managers
    threads;
    reactions;
    presence;
    artifacts;
    // Registries
    _agents = new Map();
    _agentsByName = new Map();
    _channels = new Map();
    _channelsByName = new Map();
    constructor(name, options = {}) {
        super();
        this.id = nanoid();
        this.name = name;
        this.description = options.description ?? '';
        this.iconEmoji = options.iconEmoji ?? '🏢';
        this.settings = { ...DEFAULT_SETTINGS, ...options.settings };
        this.createdAt = new Date();
        // Initialize managers
        this.threads = new ThreadManager();
        this.reactions = new ReactionManager();
        this.presence = new PresenceManager();
        this.artifacts = new ArtifactStore();
        // Create default #general channel
        this.createChannel('general', { purpose: 'General discussion' });
    }
    // ==================== Agent Management ====================
    /**
     * Register an agent to the workspace.
     */
    registerAgent(agent) {
        if (this.settings.maxAgents && this._agents.size >= this.settings.maxAgents) {
            throw new Error(`Workspace has reached max agents (${this.settings.maxAgents})`);
        }
        const workspaceAgent = {
            id: agent.id,
            name: agent.name,
            description: agent.description ?? '',
            avatarEmoji: agent.avatarEmoji ?? '🤖',
            capabilities: agent.capabilities ?? [],
            joinedAt: new Date(),
            channelIds: [],
        };
        this._agents.set(agent.id, workspaceAgent);
        this._agentsByName.set(agent.name.toLowerCase(), agent.id);
        // Initialize presence
        this.presence.getOrCreate(agent.id);
        // Auto-join #general
        const general = this.getChannel('general');
        if (general) {
            this.joinChannel(agent.id, general.id);
        }
        this.emit('agentJoined', agent.id);
        return workspaceAgent;
    }
    /**
     * Get an agent by ID.
     */
    getAgent(agentId) {
        return this._agents.get(agentId);
    }
    /**
     * Get an agent by name (for @mention lookup).
     */
    getAgentByName(name) {
        const agentId = this._agentsByName.get(name.toLowerCase());
        return agentId ? this._agents.get(agentId) : undefined;
    }
    /**
     * List all agents, optionally filtered by status.
     */
    listAgents(options = {}) {
        let agents = Array.from(this._agents.values());
        if (options.status) {
            const agentIds = new Set(this.presence.getByStatus(options.status));
            agents = agents.filter((a) => agentIds.has(a.id));
        }
        return agents;
    }
    /**
     * Find all agents with a specific capability.
     */
    findAgentsByCapability(capability) {
        return Array.from(this._agents.values()).filter((a) => a.capabilities.includes(capability));
    }
    // ==================== Channel Management ====================
    /**
     * Create a new channel in the workspace.
     */
    createChannel(name, options = {}) {
        const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
        if (this._channelsByName.has(normalizedName)) {
            throw new Error(`Channel #${normalizedName} already exists`);
        }
        const channel = new Channel({
            name: normalizedName,
            purpose: options.purpose,
            channelType: options.channelType ?? this.settings.defaultChannelType,
            workspaceId: this.id,
        });
        if (options.creatorId) {
            channel.addMember(options.creatorId, 'admin');
        }
        this._channels.set(channel.id, channel);
        this._channelsByName.set(normalizedName, channel.id);
        this.emit('channelCreated', channel);
        return channel;
    }
    /**
     * Get a channel by name or ID.
     */
    getChannel(nameOrId) {
        // Try by ID first
        if (this._channels.has(nameOrId)) {
            return this._channels.get(nameOrId);
        }
        // Try by name
        const channelId = this._channelsByName.get(nameOrId.replace(/^#/, '').toLowerCase());
        return channelId ? this._channels.get(channelId) : undefined;
    }
    /**
     * List channels in the workspace.
     */
    listChannels(options = {}) {
        const { includePrivate = false, agentId } = options;
        const channels = [];
        for (const channel of this._channels.values()) {
            if (channel.isDM)
                continue;
            if (channel.channelType === ChannelType.PRIVATE) {
                if (!includePrivate)
                    continue;
                if (agentId && !channel.isMember(agentId))
                    continue;
            }
            channels.push(channel);
        }
        return channels.sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Have an agent join a channel.
     */
    joinChannel(agentId, channelId) {
        const agent = this._agents.get(agentId);
        const channel = this._channels.get(channelId);
        if (!agent || !channel)
            return false;
        channel.addMember(agentId);
        agent.channelIds.push(channelId);
        this.emit('channelJoined', channelId, agentId);
        return true;
    }
    /**
     * Have an agent leave a channel.
     */
    leaveChannel(agentId, channelId) {
        const agent = this._agents.get(agentId);
        const channel = this._channels.get(channelId);
        if (!agent || !channel)
            return false;
        channel.removeMember(agentId);
        agent.channelIds = agent.channelIds.filter((id) => id !== channelId);
        this.emit('channelLeft', channelId, agentId);
        return true;
    }
    /**
     * Get or create a DM channel between two agents.
     */
    getDMChannel(agent1Id, agent2Id) {
        // Check if DM already exists
        for (const channel of this._channels.values()) {
            if (channel.channelType === ChannelType.DIRECT) {
                const members = new Set(channel.memberIds);
                if (members.has(agent1Id) && members.has(agent2Id) && members.size === 2) {
                    return channel;
                }
            }
        }
        // Create new DM
        const channel = createDMChannel(agent1Id, agent2Id);
        this._channels.set(channel.id, channel);
        return channel;
    }
    /**
     * Create a group DM.
     */
    createGroupDM(agentIds, name) {
        const channel = createGroupDM(agentIds, name);
        this._channels.set(channel.id, channel);
        return channel;
    }
    // ==================== Messaging ====================
    /**
     * Post a message to a channel.
     */
    postMessage(senderId, channelId, content, options = {}) {
        const agent = this._agents.get(senderId);
        const channel = this._channels.get(channelId);
        if (!agent) {
            throw new Error(`Agent ${senderId} not found`);
        }
        if (!channel) {
            throw new Error(`Channel ${channelId} not found`);
        }
        if (!channel.isMember(senderId)) {
            throw new Error(`Agent ${senderId} is not a member of channel`);
        }
        if (content.length > this.settings.maxMessageLength) {
            throw new Error(`Message exceeds max length (${this.settings.maxMessageLength})`);
        }
        const message = new Message({
            senderId,
            channelId,
            content,
            messageType: options.messageType ?? MessageType.TEXT,
            threadId: options.threadId,
            artifactIds: options.artifactIds,
            metadata: options.metadata,
        });
        // Handle threading
        if (options.threadId) {
            const thread = this.threads.getThread(options.threadId);
            if (thread) {
                thread.addReply(message);
            }
        }
        // Post to channel
        channel.postMessage(message);
        // Update presence
        const presence = this.presence.get(senderId);
        presence?.recordActivity();
        // Parse mentions and create context
        const mentions = parseMentions(content, {
            resolveAgent: (name) => this._agentsByName.get(name.toLowerCase()),
            resolveChannel: (name) => this._channelsByName.get(name.toLowerCase()),
        });
        const mentionContext = new MentionContext({
            messageId: message.id,
            channelId,
            senderId,
            mentions,
        });
        this.emit('message', message, mentionContext);
        return message;
    }
    /**
     * Reply to a message in a thread.
     */
    replyInThread(senderId, parentMessageId, content, options = {}) {
        // Find the parent message
        let parentMessage;
        let channel;
        for (const ch of this._channels.values()) {
            const msg = ch.getMessage(parentMessageId);
            if (msg) {
                parentMessage = msg;
                channel = ch;
                break;
            }
        }
        if (!parentMessage || !channel) {
            throw new Error(`Parent message ${parentMessageId} not found`);
        }
        // Get or create thread
        const thread = this.threads.getOrCreateThread(parentMessage);
        // Create the reply
        const reply = new Message({
            senderId,
            channelId: channel.id,
            content,
            threadId: thread.id,
            artifactIds: options.artifactIds,
            metadata: options.metadata,
        });
        thread.addReply(reply);
        // Parse mentions
        const mentions = parseMentions(content, {
            resolveAgent: (name) => this._agentsByName.get(name.toLowerCase()),
            resolveChannel: (name) => this._channelsByName.get(name.toLowerCase()),
        });
        const mentionContext = new MentionContext({
            messageId: reply.id,
            channelId: channel.id,
            senderId,
            mentions,
        });
        this.emit('message', reply, mentionContext);
        return reply;
    }
    /**
     * Add a reaction to a message.
     */
    addReaction(messageId, emoji, agentId) {
        const reaction = this.reactions.addReaction(messageId, emoji, agentId);
        this.emit('reaction', messageId, emoji, agentId);
        return reaction;
    }
    /**
     * Get messages from a channel.
     */
    getMessages(channelId, options = {}) {
        const channel = this._channels.get(channelId);
        return channel?.getMessages(options) ?? [];
    }
    // ==================== Presence ====================
    /**
     * Update agent presence.
     */
    setPresence(agentId, status, message = '') {
        const presence = this.presence.update(agentId, status, message);
        this.emit('presenceChanged', agentId, status);
        return presence;
    }
    /**
     * Get online agents.
     */
    getOnlineAgents() {
        const onlineIds = new Set(this.presence.getOnlineAgents());
        return Array.from(this._agents.values()).filter((a) => onlineIds.has(a.id));
    }
    /**
     * Get available agents (online with capacity).
     */
    getAvailableAgents() {
        const availableIds = new Set(this.presence.getAvailableAgents());
        return Array.from(this._agents.values()).filter((a) => availableIds.has(a.id));
    }
    // ==================== Serialization ====================
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            iconEmoji: this.iconEmoji,
            agentCount: this._agents.size,
            channelCount: this._channels.size,
            createdAt: this.createdAt,
        };
    }
    toString() {
        return `${this.iconEmoji} ${this.name} (${this._agents.size} agents, ${this._channels.size} channels)`;
    }
}
//# sourceMappingURL=workspace.js.map