/**
 * Handoff Primitive
 *
 * Handoffs are how agents pass work or context to each other.
 * They're more structured than just posting a message - they include
 * context, expectations, and acknowledgment.
 */
import { z } from 'zod';
/**
 * Why work is being handed off.
 */
export declare const HandoffReason: {
    readonly CAPABILITY_NEEDED: "capability_needed";
    readonly BETTER_SUITED: "better_suited";
    readonly AT_CAPACITY: "at_capacity";
    readonly LOAD_BALANCING: "load_balancing";
    readonly NEXT_STEP: "next_step";
    readonly REVIEW_NEEDED: "review_needed";
    readonly APPROVAL_NEEDED: "approval_needed";
    readonly STUCK: "stuck";
    readonly ERROR: "error";
    readonly ESCALATION: "escalation";
    readonly COMPLETED: "completed";
};
export type HandoffReason = (typeof HandoffReason)[keyof typeof HandoffReason];
/**
 * Status of a handoff.
 */
export declare const HandoffStatus: {
    readonly PENDING: "pending";
    readonly ACCEPTED: "accepted";
    readonly REJECTED: "rejected";
    readonly IN_PROGRESS: "in_progress";
    readonly COMPLETED: "completed";
    readonly CANCELLED: "cancelled";
    readonly EXPIRED: "expired";
};
export type HandoffStatus = (typeof HandoffStatus)[keyof typeof HandoffStatus];
/**
 * Context being passed in a handoff.
 */
export interface HandoffContext {
    summary: string;
    background?: string;
    currentState?: string;
    expectedOutcome?: string;
    messageIds?: string[];
    threadIds?: string[];
    artifactIds?: string[];
    taskIds?: string[];
    data?: Record<string, unknown>;
}
export declare const HandoffSchema: z.ZodObject<{
    id: z.ZodString;
    fromAgent: z.ZodString;
    toAgent: z.ZodOptional<z.ZodString>;
    toCapability: z.ZodOptional<z.ZodString>;
    reason: z.ZodEnum<["capability_needed", "better_suited", "at_capacity", "load_balancing", "next_step", "review_needed", "approval_needed", "stuck", "error", "escalation", "completed"]>;
    status: z.ZodEnum<["pending", "accepted", "rejected", "in_progress", "completed", "cancelled", "expired"]>;
    channelId: z.ZodOptional<z.ZodString>;
    threadId: z.ZodOptional<z.ZodString>;
    isUrgent: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodDate;
    acceptedAt: z.ZodOptional<z.ZodDate>;
    completedAt: z.ZodOptional<z.ZodDate>;
    expiresAt: z.ZodOptional<z.ZodDate>;
    acceptedBy: z.ZodOptional<z.ZodString>;
    rejectionReason: z.ZodDefault<z.ZodString>;
    completionNotes: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "expired" | "cancelled" | "pending" | "in_progress" | "completed" | "accepted" | "rejected";
    createdAt: Date;
    fromAgent: string;
    reason: "escalation" | "error" | "completed" | "capability_needed" | "better_suited" | "at_capacity" | "load_balancing" | "next_step" | "review_needed" | "approval_needed" | "stuck";
    isUrgent: boolean;
    rejectionReason: string;
    completionNotes: string;
    channelId?: string | undefined;
    threadId?: string | undefined;
    expiresAt?: Date | undefined;
    completedAt?: Date | undefined;
    toAgent?: string | undefined;
    toCapability?: string | undefined;
    acceptedAt?: Date | undefined;
    acceptedBy?: string | undefined;
}, {
    id: string;
    status: "expired" | "cancelled" | "pending" | "in_progress" | "completed" | "accepted" | "rejected";
    createdAt: Date;
    fromAgent: string;
    reason: "escalation" | "error" | "completed" | "capability_needed" | "better_suited" | "at_capacity" | "load_balancing" | "next_step" | "review_needed" | "approval_needed" | "stuck";
    channelId?: string | undefined;
    threadId?: string | undefined;
    expiresAt?: Date | undefined;
    completedAt?: Date | undefined;
    toAgent?: string | undefined;
    toCapability?: string | undefined;
    isUrgent?: boolean | undefined;
    acceptedAt?: Date | undefined;
    acceptedBy?: string | undefined;
    rejectionReason?: string | undefined;
    completionNotes?: string | undefined;
}>;
export type HandoffData = z.infer<typeof HandoffSchema>;
/**
 * A handoff of work from one agent to another.
 */
export declare class Handoff {
    readonly id: string;
    readonly fromAgent: string;
    readonly toAgent?: string;
    readonly toCapability?: string;
    readonly reason: HandoffReason;
    readonly context: HandoffContext;
    status: HandoffStatus;
    channelId?: string;
    threadId?: string;
    readonly createdAt: Date;
    acceptedAt?: Date;
    completedAt?: Date;
    expiresAt?: Date;
    acceptedBy?: string;
    rejectionReason: string;
    completionNotes: string;
    readonly isUrgent: boolean;
    constructor(data: {
        fromAgent: string;
        reason: HandoffReason;
        context: HandoffContext;
        toAgent?: string;
        toCapability?: string;
        channelId?: string;
        isUrgent?: boolean;
        expiresAt?: Date;
    });
    get isOpen(): boolean;
    get isTargeted(): boolean;
    get isExpired(): boolean;
    accept(agentId: string): this;
    reject(_agentId: string, reason?: string): this;
    start(): this;
    complete(notes?: string): this;
    cancel(): this;
    expire(): this;
    toJSON(): HandoffData & {
        context: HandoffContext;
        isOpen: boolean;
        isTargeted: boolean;
    };
    toString(): string;
}
/**
 * Manages handoffs within a workspace.
 */
export declare class HandoffManager {
    private readonly _handoffs;
    private readonly _bySender;
    private readonly _byRecipient;
    private readonly _pendingByCapability;
    /**
     * Create a new handoff.
     */
    create(data: {
        fromAgent: string;
        reason: HandoffReason;
        context: HandoffContext;
        toAgent?: string;
        toCapability?: string;
        channelId?: string;
        isUrgent?: boolean;
        expiresAt?: Date;
    }): Handoff;
    /**
     * Add a handoff to the manager.
     */
    add(handoff: Handoff): Handoff;
    /**
     * Get a handoff by ID.
     */
    get(handoffId: string): Handoff | undefined;
    /**
     * Get pending handoffs targeted at an agent.
     */
    getPendingForAgent(agentId: string): Handoff[];
    /**
     * Get pending handoffs for a capability.
     */
    getPendingForCapability(capability: string): Handoff[];
    /**
     * Get handoffs sent by an agent.
     */
    getSentBy(agentId: string, options?: {
        openOnly?: boolean;
    }): Handoff[];
    /**
     * Accept a handoff.
     */
    accept(handoffId: string, agentId: string): Handoff | undefined;
    /**
     * Reject a handoff.
     */
    reject(handoffId: string, agentId: string, reason?: string): Handoff | undefined;
    /**
     * Complete a handoff.
     */
    complete(handoffId: string, notes?: string): Handoff | undefined;
    /**
     * Mark expired handoffs.
     */
    cleanupExpired(): string[];
    /**
     * Get handoff statistics.
     */
    getStats(): {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        rejected: number;
        byReason: Record<HandoffReason, number>;
    };
}
//# sourceMappingURL=handoff.d.ts.map