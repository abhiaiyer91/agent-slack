/**
 * Agent Slack: Communication Primitives for Agent Workspaces
 *
 * A framework for enabling Slack-like collaboration between AI agents,
 * built with Mastra.
 */

// Core primitives
export {
  // Message
  Message,
  MessageType,
  MessageSchema,
  type MessageData,
  type MessageEdit,
  createRequest,
  createResponse,
  createStatusUpdate,

  // Channel
  Channel,
  ChannelType,
  ChannelSchema,
  type ChannelData,
  type ChannelMember,
  type Bookmark,
  createDMChannel,
  createGroupDM,

  // Thread
  Thread,
  ThreadManager,

  // Reaction
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

  // Mention
  Mention,
  MentionType,
  MentionContext,
  MentionSchema,
  type MentionData,
  parseMentions,
  getMentionedAgentIds,
  hasBroadcastMention,
  formatMention,

  // Presence
  Presence,
  PresenceManager,
  PresenceStatus,
  PresenceSchema,
  type PresenceData,

  // Artifact
  Artifact,
  ArtifactStore,
  ArtifactType,
  ArtifactSchema,
  ArtifactMetadataSchema,
  type ArtifactData,
  type ArtifactMetadata,

  // Workspace
  AgentWorkspace,
  type WorkspaceSettings,
  type WorkspaceAgent,
  type WorkspaceEvents,

  // Poll
  Poll,
  PollManager,
  PollStatus,
  VoteRequirement,
  type Vote,
  type PollConfig,
  type PollResult,

  // Decision Trace
  DecisionTraceStore,
  DecisionType,
  ConfidenceLevel,
  createDecisionTrace,
  type DecisionTrace,

  // Channel Summary
  SummaryManager,
  Sentiment,
  generateChannelSummary,
  type ChannelSummary,

  // Audit Log
  AuditLog,
  AuditEventType,
  AuditSeverity,
  createAuditEntry,
  createCorrelationId,
  type AuditEntry,
} from './primitives/index.js';

// Coordination primitives
export {
  // Task
  Task,
  TaskManager,
  TaskStatus,
  TaskPriority,
  TaskSchema,
  type TaskData,
  type TaskComment,

  // Handoff
  Handoff,
  HandoffManager,
  HandoffReason,
  HandoffStatus,
  HandoffSchema,
  type HandoffData,
  type HandoffContext,

  // Workflow
  Workflow,
  WorkflowStep,
  WorkflowBuilder,
  WorkflowManager,
  WorkflowStatus,
  StepStatus,
  type WorkflowStepData,
} from './coordination/index.js';

// Mastra tools
export { createSlackTools, getSlackToolsArray } from './tools/index.js';
