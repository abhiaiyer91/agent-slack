/**
 * Core primitives for agent communication.
 */

// Message
export {
  Message,
  MessageType,
  MessageSchema,
  type MessageData,
  type MessageEdit,
  createRequest,
  createResponse,
  createStatusUpdate,
} from './message.js';

// Channel
export {
  Channel,
  ChannelType,
  ChannelSchema,
  type ChannelData,
  type ChannelMember,
  type Bookmark,
  createDMChannel,
  createGroupDM,
} from './channel.js';

// Thread
export {
  Thread,
  ThreadManager,
} from './thread.js';

// Reaction
export {
  Reaction,
  ReactionSummary,
  ReactionManager,
  SemanticReactions,
  type SemanticReactionCode,
  type ReactionData,
  acknowledge,
  approve,
  complete,
  workingOn,
  alert,
} from './reaction.js';

// Mention
export {
  Mention,
  MentionType,
  MentionContext,
  MentionSchema,
  type MentionData,
  parseMentions,
  getMentionedAgentIds,
  hasBroadcastMention,
  formatMention,
} from './mention.js';

// Presence
export {
  Presence,
  PresenceManager,
  PresenceStatus,
  PresenceSchema,
  type PresenceData,
} from './presence.js';

// Artifact
export {
  Artifact,
  ArtifactStore,
  ArtifactType,
  ArtifactSchema,
  ArtifactMetadataSchema,
  type ArtifactData,
  type ArtifactMetadata,
} from './artifact.js';

// Workspace
export {
  AgentWorkspace,
  type WorkspaceSettings,
  type WorkspaceAgent,
  type WorkspaceEvents,
} from './workspace.js';
