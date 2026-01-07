/**
 * Agent Slack: Communication Primitives for Agent Workspaces
 *
 * A framework for enabling Slack-like collaboration between AI agents,
 * built with Mastra.
 */
// Core primitives
export { 
// Message
Message, MessageType, MessageSchema, createRequest, createResponse, createStatusUpdate, 
// Channel
Channel, ChannelType, ChannelSchema, createDMChannel, createGroupDM, 
// Thread
Thread, ThreadManager, 
// Reaction
Reaction, ReactionSummary, ReactionManager, SemanticReactions, acknowledge, approve, complete, workingOn, alert, 
// Mention
Mention, MentionType, MentionContext, MentionSchema, parseMentions, getMentionedAgentIds, hasBroadcastMention, formatMention, 
// Presence
Presence, PresenceManager, PresenceStatus, PresenceSchema, 
// Artifact
Artifact, ArtifactStore, ArtifactType, ArtifactSchema, ArtifactMetadataSchema, 
// Workspace
AgentWorkspace, 
// Poll
Poll, PollManager, PollStatus, VoteRequirement, 
// Decision Trace
DecisionTraceStore, DecisionType, ConfidenceLevel, createDecisionTrace, 
// Channel Summary
SummaryManager, Sentiment, generateChannelSummary, 
// Audit Log
AuditLog, AuditEventType, AuditSeverity, createAuditEntry, createCorrelationId, } from './primitives/index.js';
// Coordination primitives
export { 
// Task
Task, TaskManager, TaskStatus, TaskPriority, TaskSchema, 
// Handoff
Handoff, HandoffManager, HandoffReason, HandoffStatus, HandoffSchema, 
// Workflow
Workflow, WorkflowStep, WorkflowBuilder, WorkflowManager, WorkflowStatus, StepStatus, } from './coordination/index.js';
// Mastra tools
export { createSlackTools, getSlackToolsArray } from './tools/index.js';
//# sourceMappingURL=index.js.map