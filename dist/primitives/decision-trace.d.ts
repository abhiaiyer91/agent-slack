/**
 * Decision Trace Primitive
 *
 * Tracks agent decisions for debugging, auditing, and learning.
 * Every significant agent action can be traced back to understand
 * the reasoning chain.
 */
/**
 * Types of decisions agents can make.
 */
export declare const DecisionType: {
    readonly ACTION: "action";
    readonly RESPONSE: "response";
    readonly HANDOFF: "handoff";
    readonly APPROVAL: "approval";
    readonly REJECTION: "rejection";
    readonly ESCALATION: "escalation";
    readonly CLASSIFICATION: "classification";
    readonly RECOMMENDATION: "recommendation";
};
export type DecisionType = (typeof DecisionType)[keyof typeof DecisionType];
/**
 * Confidence levels for decisions.
 */
export declare const ConfidenceLevel: {
    readonly VERY_LOW: "very_low";
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
    readonly VERY_HIGH: "very_high";
};
export type ConfidenceLevel = (typeof ConfidenceLevel)[keyof typeof ConfidenceLevel];
/**
 * A single decision made by an agent.
 */
export interface DecisionTrace {
    id: string;
    agentId: string;
    timestamp: Date;
    decisionType: DecisionType;
    decision: string;
    reasoning: string;
    confidence: number;
    confidenceLevel: ConfidenceLevel;
    inputs: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    parentDecisionId?: string;
    childDecisionIds: string[];
    channelId?: string;
    messageId?: string;
    taskId?: string;
    tags: string[];
    metadata: Record<string, unknown>;
}
/**
 * Create a decision trace.
 */
export declare function createDecisionTrace(data: {
    agentId: string;
    decisionType: DecisionType;
    decision: string;
    reasoning: string;
    confidence: number;
    inputs: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    parentDecisionId?: string;
    channelId?: string;
    messageId?: string;
    taskId?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
}): DecisionTrace;
/**
 * Storage and querying for decision traces.
 */
export declare class DecisionTraceStore {
    private readonly _traces;
    private readonly _byAgent;
    private readonly _byChannel;
    private readonly _byTask;
    /**
     * Store a decision trace.
     */
    store(trace: DecisionTrace): DecisionTrace;
    /**
     * Log a decision (convenience method).
     */
    log(data: Parameters<typeof createDecisionTrace>[0]): DecisionTrace;
    /**
     * Get a trace by ID.
     */
    get(traceId: string): DecisionTrace | undefined;
    /**
     * Get the full chain of decisions leading to this one.
     */
    getChain(traceId: string): DecisionTrace[];
    /**
     * Get all downstream decisions from this one.
     */
    getDownstream(traceId: string): DecisionTrace[];
    /**
     * Get traces for an agent.
     */
    getByAgent(agentId: string, options?: {
        limit?: number;
        since?: Date;
    }): DecisionTrace[];
    /**
     * Get traces in a channel.
     */
    getByChannel(channelId: string, options?: {
        limit?: number;
        since?: Date;
    }): DecisionTrace[];
    /**
     * Get traces for a task.
     */
    getByTask(taskId: string): DecisionTrace[];
    /**
     * Search traces.
     */
    search(query: {
        agentId?: string;
        decisionType?: DecisionType;
        minConfidence?: number;
        maxConfidence?: number;
        since?: Date;
        until?: Date;
        tags?: string[];
        limit?: number;
    }): DecisionTrace[];
    /**
     * Get low-confidence decisions for review.
     */
    getLowConfidenceDecisions(threshold?: number, limit?: number): DecisionTrace[];
    /**
     * Get statistics.
     */
    getStats(): {
        total: number;
        byAgent: Record<string, number>;
        byType: Record<DecisionType, number>;
        byConfidence: Record<ConfidenceLevel, number>;
        avgConfidence: number;
    };
}
//# sourceMappingURL=decision-trace.d.ts.map