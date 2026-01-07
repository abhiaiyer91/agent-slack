/**
 * Audit Log Primitive
 *
 * Immutable record of all significant actions in the workspace.
 * Critical for compliance, debugging, and understanding agent behavior.
 */
import { nanoid } from 'nanoid';
/**
 * Types of events that can be audited.
 */
export const AuditEventType = {
    // Agent events
    AGENT_REGISTERED: 'agent.registered',
    AGENT_STATUS_CHANGED: 'agent.status_changed',
    // Channel events
    CHANNEL_CREATED: 'channel.created',
    CHANNEL_JOINED: 'channel.joined',
    CHANNEL_LEFT: 'channel.left',
    CHANNEL_ARCHIVED: 'channel.archived',
    // Message events
    MESSAGE_POSTED: 'message.posted',
    MESSAGE_EDITED: 'message.edited',
    MESSAGE_DELETED: 'message.deleted',
    REACTION_ADDED: 'reaction.added',
    REACTION_REMOVED: 'reaction.removed',
    // Task events
    TASK_CREATED: 'task.created',
    TASK_ASSIGNED: 'task.assigned',
    TASK_COMPLETED: 'task.completed',
    TASK_FAILED: 'task.failed',
    // Handoff events
    HANDOFF_INITIATED: 'handoff.initiated',
    HANDOFF_ACCEPTED: 'handoff.accepted',
    HANDOFF_REJECTED: 'handoff.rejected',
    HANDOFF_COMPLETED: 'handoff.completed',
    // Decision events
    DECISION_MADE: 'decision.made',
    APPROVAL_REQUESTED: 'approval.requested',
    APPROVAL_GRANTED: 'approval.granted',
    APPROVAL_DENIED: 'approval.denied',
    // Poll events
    POLL_CREATED: 'poll.created',
    POLL_VOTED: 'poll.voted',
    POLL_DECIDED: 'poll.decided',
    // Workflow events
    WORKFLOW_STARTED: 'workflow.started',
    WORKFLOW_STEP_COMPLETED: 'workflow.step_completed',
    WORKFLOW_COMPLETED: 'workflow.completed',
    WORKFLOW_FAILED: 'workflow.failed',
    // System events
    SYSTEM_ERROR: 'system.error',
    RATE_LIMIT_HIT: 'system.rate_limit',
    POLICY_VIOLATION: 'system.policy_violation',
};
/**
 * Severity levels for audit events.
 */
export const AuditSeverity = {
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical',
};
/**
 * Create an audit entry.
 */
export function createAuditEntry(data) {
    return {
        id: nanoid(),
        timestamp: new Date(),
        eventType: data.eventType,
        severity: data.severity ?? AuditSeverity.INFO,
        actorId: data.actorId,
        actorType: data.actorType,
        targetType: data.targetType,
        targetId: data.targetId,
        workspaceId: data.workspaceId,
        channelId: data.channelId,
        messageId: data.messageId,
        description: data.description,
        data: data.data ?? {},
        before: data.before,
        after: data.after,
        correlationId: data.correlationId,
        parentEventId: data.parentEventId,
        tags: data.tags ?? [],
    };
}
/**
 * Audit log storage and querying.
 */
export class AuditLog {
    _entries = [];
    _byActor = new Map();
    _byChannel = new Map();
    _byCorrelation = new Map();
    _byEventType = new Map();
    workspaceId;
    retentionDays;
    constructor(workspaceId, options) {
        this.workspaceId = workspaceId;
        this.retentionDays = options?.retentionDays;
    }
    /**
     * Log an event.
     */
    log(data) {
        const entry = createAuditEntry({
            ...data,
            workspaceId: this.workspaceId,
        });
        const index = this._entries.length;
        this._entries.push(entry);
        // Index by actor
        if (!this._byActor.has(entry.actorId)) {
            this._byActor.set(entry.actorId, []);
        }
        this._byActor.get(entry.actorId).push(index);
        // Index by channel
        if (entry.channelId) {
            if (!this._byChannel.has(entry.channelId)) {
                this._byChannel.set(entry.channelId, []);
            }
            this._byChannel.get(entry.channelId).push(index);
        }
        // Index by correlation
        if (entry.correlationId) {
            if (!this._byCorrelation.has(entry.correlationId)) {
                this._byCorrelation.set(entry.correlationId, []);
            }
            this._byCorrelation.get(entry.correlationId).push(index);
        }
        // Index by event type
        if (!this._byEventType.has(entry.eventType)) {
            this._byEventType.set(entry.eventType, []);
        }
        this._byEventType.get(entry.eventType).push(index);
        return entry;
    }
    /**
     * Get an entry by ID.
     */
    get(entryId) {
        return this._entries.find((e) => e.id === entryId);
    }
    /**
     * Query audit entries.
     */
    query(options = {}) {
        let entries = [...this._entries];
        // Filter by event types
        if (options.eventTypes?.length) {
            entries = entries.filter((e) => options.eventTypes.includes(e.eventType));
        }
        // Filter by actor
        if (options.actorIds?.length) {
            entries = entries.filter((e) => options.actorIds.includes(e.actorId));
        }
        // Filter by actor type
        if (options.actorTypes?.length) {
            entries = entries.filter((e) => options.actorTypes.includes(e.actorType));
        }
        // Filter by severity
        if (options.severity?.length) {
            entries = entries.filter((e) => options.severity.includes(e.severity));
        }
        // Filter by channel
        if (options.channelId) {
            entries = entries.filter((e) => e.channelId === options.channelId);
        }
        // Filter by target
        if (options.targetType) {
            entries = entries.filter((e) => e.targetType === options.targetType);
        }
        if (options.targetId) {
            entries = entries.filter((e) => e.targetId === options.targetId);
        }
        // Filter by correlation
        if (options.correlationId) {
            entries = entries.filter((e) => e.correlationId === options.correlationId);
        }
        // Filter by time range
        if (options.since) {
            entries = entries.filter((e) => e.timestamp >= options.since);
        }
        if (options.until) {
            entries = entries.filter((e) => e.timestamp <= options.until);
        }
        // Filter by tags
        if (options.tags?.length) {
            entries = entries.filter((e) => options.tags.some((tag) => e.tags.includes(tag)));
        }
        // Sort by timestamp (newest first)
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        // Pagination
        if (options.offset) {
            entries = entries.slice(options.offset);
        }
        if (options.limit) {
            entries = entries.slice(0, options.limit);
        }
        return entries;
    }
    /**
     * Get entries for a correlation chain.
     */
    getCorrelatedEvents(correlationId) {
        const indices = this._byCorrelation.get(correlationId) ?? [];
        return indices
            .map((i) => this._entries[i])
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    /**
     * Get entries for an actor.
     */
    getActorActivity(actorId, options) {
        const indices = this._byActor.get(actorId) ?? [];
        let entries = indices.map((i) => this._entries[i]);
        if (options?.since) {
            entries = entries.filter((e) => e.timestamp >= options.since);
        }
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        if (options?.limit) {
            entries = entries.slice(0, options.limit);
        }
        return entries;
    }
    /**
     * Get error/warning events.
     */
    getIssues(options) {
        return this.query({
            severity: [AuditSeverity.WARNING, AuditSeverity.ERROR, AuditSeverity.CRITICAL],
            since: options?.since,
            limit: options?.limit,
        });
    }
    /**
     * Get statistics.
     */
    getStats(since) {
        let entries = this._entries;
        if (since) {
            entries = entries.filter((e) => e.timestamp >= since);
        }
        const byEventType = {};
        const bySeverity = {};
        const byActor = {};
        let errorCount = 0;
        for (const entry of entries) {
            byEventType[entry.eventType] = (byEventType[entry.eventType] ?? 0) + 1;
            bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1;
            byActor[entry.actorId] = (byActor[entry.actorId] ?? 0) + 1;
            if (entry.severity === AuditSeverity.ERROR || entry.severity === AuditSeverity.CRITICAL) {
                errorCount++;
            }
        }
        return {
            total: entries.length,
            byEventType,
            bySeverity,
            byActor,
            errorRate: entries.length > 0 ? errorCount / entries.length : 0,
        };
    }
    /**
     * Export entries (for backup/analysis).
     */
    export(options) {
        const entries = this.query(options);
        return JSON.stringify(entries, null, 2);
    }
    /**
     * Cleanup old entries based on retention policy.
     */
    cleanup() {
        if (!this.retentionDays)
            return 0;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.retentionDays);
        const initialLength = this._entries.length;
        // Find first entry to keep
        let keepFrom = 0;
        for (let i = 0; i < this._entries.length; i++) {
            if (this._entries[i].timestamp >= cutoff) {
                keepFrom = i;
                break;
            }
        }
        if (keepFrom > 0) {
            this._entries.splice(0, keepFrom);
            // Note: Indices in maps are now stale - in production, use a proper DB
        }
        return initialLength - this._entries.length;
    }
    get size() {
        return this._entries.length;
    }
}
/**
 * Helper to create a correlation ID for related events.
 */
export function createCorrelationId() {
    return `corr_${nanoid(12)}`;
}
//# sourceMappingURL=audit-log.js.map