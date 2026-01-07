/**
 * Decision Trace Primitive
 *
 * Tracks agent decisions for debugging, auditing, and learning.
 * Every significant agent action can be traced back to understand
 * the reasoning chain.
 */
import { nanoid } from 'nanoid';
/**
 * Types of decisions agents can make.
 */
export const DecisionType = {
    ACTION: 'action', // Took an action
    RESPONSE: 'response', // Responded to a request
    HANDOFF: 'handoff', // Handed off to another agent
    APPROVAL: 'approval', // Approved something
    REJECTION: 'rejection', // Rejected something
    ESCALATION: 'escalation', // Escalated an issue
    CLASSIFICATION: 'classification', // Classified/categorized
    RECOMMENDATION: 'recommendation', // Made a recommendation
};
/**
 * Confidence levels for decisions.
 */
export const ConfidenceLevel = {
    VERY_LOW: 'very_low', // < 20%
    LOW: 'low', // 20-40%
    MEDIUM: 'medium', // 40-60%
    HIGH: 'high', // 60-80%
    VERY_HIGH: 'very_high', // > 80%
};
/**
 * Create a decision trace.
 */
export function createDecisionTrace(data) {
    // Calculate confidence level
    let confidenceLevel;
    if (data.confidence < 0.2) {
        confidenceLevel = ConfidenceLevel.VERY_LOW;
    }
    else if (data.confidence < 0.4) {
        confidenceLevel = ConfidenceLevel.LOW;
    }
    else if (data.confidence < 0.6) {
        confidenceLevel = ConfidenceLevel.MEDIUM;
    }
    else if (data.confidence < 0.8) {
        confidenceLevel = ConfidenceLevel.HIGH;
    }
    else {
        confidenceLevel = ConfidenceLevel.VERY_HIGH;
    }
    return {
        id: nanoid(),
        agentId: data.agentId,
        timestamp: new Date(),
        decisionType: data.decisionType,
        decision: data.decision,
        reasoning: data.reasoning,
        confidence: data.confidence,
        confidenceLevel,
        inputs: data.inputs,
        outputs: data.outputs,
        parentDecisionId: data.parentDecisionId,
        childDecisionIds: [],
        channelId: data.channelId,
        messageId: data.messageId,
        taskId: data.taskId,
        tags: data.tags ?? [],
        metadata: data.metadata ?? {},
    };
}
/**
 * Storage and querying for decision traces.
 */
export class DecisionTraceStore {
    _traces = new Map();
    _byAgent = new Map();
    _byChannel = new Map();
    _byTask = new Map();
    /**
     * Store a decision trace.
     */
    store(trace) {
        this._traces.set(trace.id, trace);
        // Index by agent
        if (!this._byAgent.has(trace.agentId)) {
            this._byAgent.set(trace.agentId, []);
        }
        this._byAgent.get(trace.agentId).push(trace.id);
        // Index by channel
        if (trace.channelId) {
            if (!this._byChannel.has(trace.channelId)) {
                this._byChannel.set(trace.channelId, []);
            }
            this._byChannel.get(trace.channelId).push(trace.id);
        }
        // Index by task
        if (trace.taskId) {
            if (!this._byTask.has(trace.taskId)) {
                this._byTask.set(trace.taskId, []);
            }
            this._byTask.get(trace.taskId).push(trace.id);
        }
        // Link to parent
        if (trace.parentDecisionId) {
            const parent = this._traces.get(trace.parentDecisionId);
            if (parent) {
                parent.childDecisionIds.push(trace.id);
            }
        }
        return trace;
    }
    /**
     * Log a decision (convenience method).
     */
    log(data) {
        const trace = createDecisionTrace(data);
        return this.store(trace);
    }
    /**
     * Get a trace by ID.
     */
    get(traceId) {
        return this._traces.get(traceId);
    }
    /**
     * Get the full chain of decisions leading to this one.
     */
    getChain(traceId) {
        const chain = [];
        let current = this.get(traceId);
        while (current) {
            chain.unshift(current);
            current = current.parentDecisionId
                ? this.get(current.parentDecisionId)
                : undefined;
        }
        return chain;
    }
    /**
     * Get all downstream decisions from this one.
     */
    getDownstream(traceId) {
        const downstream = [];
        const queue = [traceId];
        const seen = new Set();
        while (queue.length > 0) {
            const id = queue.shift();
            if (seen.has(id))
                continue;
            seen.add(id);
            const trace = this.get(id);
            if (trace) {
                if (id !== traceId) {
                    downstream.push(trace);
                }
                queue.push(...trace.childDecisionIds);
            }
        }
        return downstream;
    }
    /**
     * Get traces for an agent.
     */
    getByAgent(agentId, options) {
        const ids = this._byAgent.get(agentId) ?? [];
        let traces = ids.map((id) => this._traces.get(id)).filter(Boolean);
        if (options?.since) {
            traces = traces.filter((t) => t.timestamp >= options.since);
        }
        traces.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        if (options?.limit) {
            traces = traces.slice(0, options.limit);
        }
        return traces;
    }
    /**
     * Get traces in a channel.
     */
    getByChannel(channelId, options) {
        const ids = this._byChannel.get(channelId) ?? [];
        let traces = ids.map((id) => this._traces.get(id)).filter(Boolean);
        if (options?.since) {
            traces = traces.filter((t) => t.timestamp >= options.since);
        }
        traces.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        if (options?.limit) {
            traces = traces.slice(0, options.limit);
        }
        return traces;
    }
    /**
     * Get traces for a task.
     */
    getByTask(taskId) {
        const ids = this._byTask.get(taskId) ?? [];
        const traces = ids.map((id) => this._traces.get(id)).filter(Boolean);
        return traces.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    /**
     * Search traces.
     */
    search(query) {
        let traces = Array.from(this._traces.values());
        if (query.agentId) {
            traces = traces.filter((t) => t.agentId === query.agentId);
        }
        if (query.decisionType) {
            traces = traces.filter((t) => t.decisionType === query.decisionType);
        }
        if (query.minConfidence !== undefined) {
            traces = traces.filter((t) => t.confidence >= query.minConfidence);
        }
        if (query.maxConfidence !== undefined) {
            traces = traces.filter((t) => t.confidence <= query.maxConfidence);
        }
        if (query.since) {
            traces = traces.filter((t) => t.timestamp >= query.since);
        }
        if (query.until) {
            traces = traces.filter((t) => t.timestamp <= query.until);
        }
        if (query.tags?.length) {
            traces = traces.filter((t) => query.tags.some((tag) => t.tags.includes(tag)));
        }
        traces.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        if (query.limit) {
            traces = traces.slice(0, query.limit);
        }
        return traces;
    }
    /**
     * Get low-confidence decisions for review.
     */
    getLowConfidenceDecisions(threshold = 0.5, limit = 20) {
        return this.search({ maxConfidence: threshold, limit });
    }
    /**
     * Get statistics.
     */
    getStats() {
        const traces = Array.from(this._traces.values());
        const byAgent = {};
        const byType = {};
        const byConfidence = {};
        let totalConfidence = 0;
        for (const trace of traces) {
            byAgent[trace.agentId] = (byAgent[trace.agentId] ?? 0) + 1;
            byType[trace.decisionType] = (byType[trace.decisionType] ?? 0) + 1;
            byConfidence[trace.confidenceLevel] = (byConfidence[trace.confidenceLevel] ?? 0) + 1;
            totalConfidence += trace.confidence;
        }
        return {
            total: traces.length,
            byAgent,
            byType,
            byConfidence,
            avgConfidence: traces.length > 0 ? totalConfidence / traces.length : 0,
        };
    }
}
//# sourceMappingURL=decision-trace.js.map