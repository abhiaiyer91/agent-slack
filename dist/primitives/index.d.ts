/**
 * Core primitives for agent communication.
 */
export { Message, MessageType, MessageSchema, type MessageData, type MessageEdit, createRequest, createResponse, createStatusUpdate, } from './message.js';
export { Channel, ChannelType, ChannelSchema, type ChannelData, type ChannelMember, type Bookmark, createDMChannel, createGroupDM, } from './channel.js';
export { Thread, ThreadManager, } from './thread.js';
export { Reaction, ReactionSummary, ReactionManager, SemanticReactions, type SemanticReactionCode, type ReactionData, acknowledge, approve, complete, workingOn, alert, } from './reaction.js';
export { Mention, MentionType, MentionContext, MentionSchema, type MentionData, parseMentions, getMentionedAgentIds, hasBroadcastMention, formatMention, } from './mention.js';
export { Presence, PresenceManager, PresenceStatus, PresenceSchema, type PresenceData, } from './presence.js';
export { Artifact, ArtifactStore, ArtifactType, ArtifactSchema, ArtifactMetadataSchema, type ArtifactData, type ArtifactMetadata, } from './artifact.js';
export { AgentWorkspace, type WorkspaceSettings, type WorkspaceAgent, type WorkspaceEvents, } from './workspace.js';
//# sourceMappingURL=index.d.ts.map