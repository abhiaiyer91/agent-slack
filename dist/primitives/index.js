/**
 * Core primitives for agent communication.
 */
// Message
export { Message, MessageType, MessageSchema, createRequest, createResponse, createStatusUpdate, } from './message.js';
// Channel
export { Channel, ChannelType, ChannelSchema, createDMChannel, createGroupDM, } from './channel.js';
// Thread
export { Thread, ThreadManager, } from './thread.js';
// Reaction
export { Reaction, ReactionSummary, ReactionManager, SemanticReactions, acknowledge, approve, complete, workingOn, alert, } from './reaction.js';
// Mention
export { Mention, MentionType, MentionContext, MentionSchema, parseMentions, getMentionedAgentIds, hasBroadcastMention, formatMention, } from './mention.js';
// Presence
export { Presence, PresenceManager, PresenceStatus, PresenceSchema, } from './presence.js';
// Artifact
export { Artifact, ArtifactStore, ArtifactType, ArtifactSchema, ArtifactMetadataSchema, } from './artifact.js';
// Workspace
export { AgentWorkspace, } from './workspace.js';
//# sourceMappingURL=index.js.map