/**
 * Audit Log Primitive
 *
 * Immutable record of all significant actions in the workspace.
 * Critical for compliance, debugging, and understanding agent behavior.
 */
/**
 * Types of events that can be audited.
 */
export declare const AuditEventType: {
    readonly AGENT_REGISTERED: "agent.registered";
    readonly AGENT_STATUS_CHANGED: "agent.status_changed";
    readonly CHANNEL_CREATED: "channel.created";
    readonly CHANNEL_JOINED: "channel.joined";
    readonly CHANNEL_LEFT: "channel.left";
    readonly CHANNEL_ARCHIVED: "channel.archived";
    readonly MESSAGE_POSTED: "message.posted";
    readonly MESSAGE_EDITED: "message.edited";
    readonly MESSAGE_DELETED: "message.deleted";
    readonly REACTION_ADDED: "reaction.added";
    readonly REACTION_REMOVED: "reaction.removed";
    readonly TASK_CREATED: "task.created";
    readonly TASK_ASSIGNED: "task.assigned";
    readonly TASK_COMPLETED: "task.completed";
    readonly TASK_FAILED: "task.failed";
    readonly HANDOFF_INITIATED: "handoff.initiated";
    readonly HANDOFF_ACCEPTED: "handoff.accepted";
    readonly HANDOFF_REJECTED: "handoff.rejected";
    readonly HANDOFF_COMPLETED: "handoff.completed";
    readonly DECISION_MADE: "decision.made";
    readonly APPROVAL_REQUESTED: "approval.requested";
    readonly APPROVAL_GRANTED: "approval.granted";
    readonly APPROVAL_DENIED: "approval.denied";
    readonly POLL_CREATED: "poll.created";
    readonly POLL_VOTED: "poll.voted";
    readonly POLL_DECIDED: "poll.decided";
    readonly WORKFLOW_STARTED: "workflow.started";
    readonly WORKFLOW_STEP_COMPLETED: "workflow.step_completed";
    readonly WORKFLOW_COMPLETED: "workflow.completed";
    readonly WORKFLOW_FAILED: "workflow.failed";
    readonly SYSTEM_ERROR: "system.error";
    readonly RATE_LIMIT_HIT: "system.rate_limit";
    readonly POLICY_VIOLATION: "system.policy_violation";
};
export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType];
/**
 * Severity levels for audit events.
 */
export declare const AuditSeverity: {
    readonly DEBUG: "debug";
    readonly INFO: "info";
    readonly WARNING: "warning";
    readonly ERROR: "error";
    readonly CRITICAL: "critical";
};
export type AuditSeverity = (typeof AuditSeverity)[keyof typeof AuditSeverity];
/**
 * A single audit log entry.
 */
export interface AuditEntry {
    id: string;
    timestamp: Date;
    eventType: AuditEventType;
    severity: AuditSeverity;
    actorId: string;
    actorType: 'agent' | 'system' | 'human';
    targetType?: string;
    targetId?: string;
    workspaceId: string;
    channelId?: string;
    messageId?: string;
    description: string;
    data: Record<string, unknown>;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    correlationId?: string;
    parentEventId?: string;
    tags: string[];
    ipAddress?: string;
    userAgent?: string;
}
/**
 * Create an audit entry.
 */
export declare function createAuditEntry(data: {
    eventType: AuditEventType;
    actorId: string;
    actorType: 'agent' | 'system' | 'human';
    workspaceId: string;
    description: string;
    severity?: AuditSeverity;
    targetType?: string;
    targetId?: string;
    channelId?: string;
    messageId?: string;
    data?: Record<string, unknown>;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    correlationId?: string;
    parentEventId?: string;
    tags?: string[];
}): AuditEntry;
/**
 * Query options for audit logs.
 */
export interface AuditQueryOptions {
    eventTypes?: AuditEventType[];
    actorIds?: string[];
    actorTypes?: ('agent' | 'system' | 'human')[];
    severity?: AuditSeverity[];
    channelId?: string;
    targetType?: string;
    targetId?: string;
    correlationId?: string;
    since?: Date;
    until?: Date;
    tags?: string[];
    limit?: number;
    offset?: number;
}
/**
 * Audit log storage and querying.
 */
export declare class AuditLog {
    private readonly _entries;
    private readonly _byActor;
    private readonly _byChannel;
    private readonly _byCorrelation;
    private readonly _byEventType;
    readonly workspaceId: string;
    readonly retentionDays?: number;
    constructor(workspaceId: string, options?: {
        retentionDays?: number;
    });
    /**
     * Log an event.
     */
    log(data: Omit<Parameters<typeof createAuditEntry>[0], 'workspaceId'>): AuditEntry;
    /**
     * Get an entry by ID.
     */
    get(entryId: string): AuditEntry | undefined;
    /**
     * Query audit entries.
     */
    query(options?: AuditQueryOptions): AuditEntry[];
    /**
     * Get entries for a correlation chain.
     */
    getCorrelatedEvents(correlationId: string): AuditEntry[];
    /**
     * Get entries for an actor.
     */
    getActorActivity(actorId: string, options?: {
        since?: Date;
        limit?: number;
    }): AuditEntry[];
    /**
     * Get error/warning events.
     */
    getIssues(options?: {
        since?: Date;
        limit?: number;
    }): AuditEntry[];
    /**
     * Get statistics.
     */
    getStats(since?: Date): {
        total: number;
        byEventType: Record<string, number>;
        bySeverity: Record<string, number>;
        byActor: Record<string, number>;
        errorRate: number;
    };
    /**
     * Export entries (for backup/analysis).
     */
    export(options?: AuditQueryOptions): string;
    /**
     * Cleanup old entries based on retention policy.
     */
    cleanup(): number;
    get size(): number;
}
/**
 * Helper to create a correlation ID for related events.
 */
export declare function createCorrelationId(): string;
//# sourceMappingURL=audit-log.d.ts.map