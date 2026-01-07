/**
 * Task Primitive
 *
 * Tasks are units of work that agents can assign to each other.
 * They provide structure beyond simple messages - tracking state,
 * ownership, deadlines, and completion.
 */
import { z } from 'zod';
/**
 * Status of a task.
 */
export declare const TaskStatus: {
    readonly PENDING: "pending";
    readonly ASSIGNED: "assigned";
    readonly IN_PROGRESS: "in_progress";
    readonly BLOCKED: "blocked";
    readonly IN_REVIEW: "in_review";
    readonly COMPLETED: "completed";
    readonly CANCELLED: "cancelled";
    readonly FAILED: "failed";
};
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
/**
 * Priority levels for tasks.
 */
export declare const TaskPriority: {
    readonly CRITICAL: "critical";
    readonly HIGH: "high";
    readonly MEDIUM: "medium";
    readonly LOW: "low";
    readonly BACKGROUND: "background";
};
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];
export declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    createdBy: z.ZodString;
    assignedTo: z.ZodOptional<z.ZodString>;
    reviewers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodEnum<["pending", "assigned", "in_progress", "blocked", "in_review", "completed", "cancelled", "failed"]>;
    priority: z.ZodEnum<["critical", "high", "medium", "low", "background"]>;
    channelId: z.ZodOptional<z.ZodString>;
    threadId: z.ZodOptional<z.ZodString>;
    sourceMessageId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    startedAt: z.ZodOptional<z.ZodDate>;
    completedAt: z.ZodOptional<z.ZodDate>;
    dueAt: z.ZodOptional<z.ZodDate>;
    progressPercent: z.ZodDefault<z.ZodNumber>;
    statusMessage: z.ZodDefault<z.ZodString>;
    inputData: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    outputData: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    blockedBy: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    blocks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "pending" | "assigned" | "in_progress" | "blocked" | "in_review" | "completed" | "cancelled" | "failed";
    createdAt: Date;
    statusMessage: string;
    createdBy: string;
    title: string;
    description: string;
    tags: string[];
    reviewers: string[];
    priority: "critical" | "high" | "medium" | "low" | "background";
    progressPercent: number;
    inputData: Record<string, unknown>;
    outputData: Record<string, unknown>;
    blockedBy: string[];
    blocks: string[];
    channelId?: string | undefined;
    threadId?: string | undefined;
    assignedTo?: string | undefined;
    sourceMessageId?: string | undefined;
    startedAt?: Date | undefined;
    completedAt?: Date | undefined;
    dueAt?: Date | undefined;
}, {
    id: string;
    status: "pending" | "assigned" | "in_progress" | "blocked" | "in_review" | "completed" | "cancelled" | "failed";
    createdAt: Date;
    createdBy: string;
    title: string;
    priority: "critical" | "high" | "medium" | "low" | "background";
    channelId?: string | undefined;
    threadId?: string | undefined;
    statusMessage?: string | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    assignedTo?: string | undefined;
    reviewers?: string[] | undefined;
    sourceMessageId?: string | undefined;
    startedAt?: Date | undefined;
    completedAt?: Date | undefined;
    dueAt?: Date | undefined;
    progressPercent?: number | undefined;
    inputData?: Record<string, unknown> | undefined;
    outputData?: Record<string, unknown> | undefined;
    blockedBy?: string[] | undefined;
    blocks?: string[] | undefined;
}>;
export type TaskData = z.infer<typeof TaskSchema>;
/**
 * A comment or update on a task.
 */
export interface TaskComment {
    id: string;
    agentId: string;
    content: string;
    createdAt: Date;
    messageId?: string;
}
/**
 * A task assigned to an agent.
 */
export declare class Task {
    readonly id: string;
    title: string;
    description: string;
    readonly createdBy: string;
    assignedTo?: string;
    reviewers: string[];
    status: TaskStatus;
    priority: TaskPriority;
    channelId?: string;
    threadId?: string;
    sourceMessageId?: string;
    readonly createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    dueAt?: Date;
    progressPercent: number;
    statusMessage: string;
    inputData: Record<string, unknown>;
    outputData: Record<string, unknown>;
    blockedBy: string[];
    blocks: string[];
    readonly comments: TaskComment[];
    tags: string[];
    metadata: Record<string, unknown>;
    constructor(data: Partial<TaskData> & {
        title: string;
        createdBy: string;
    });
    get isOpen(): boolean;
    get isBlocked(): boolean;
    get isOverdue(): boolean;
    get duration(): number | undefined;
    assign(agentId: string): this;
    start(): this;
    updateProgress(percent: number, message?: string): this;
    block(reason: string, blockedByTaskId?: string): this;
    unblock(taskId?: string): this;
    submitForReview(output?: Record<string, unknown>): this;
    complete(output?: Record<string, unknown>): this;
    cancel(reason?: string): this;
    fail(reason?: string, error?: unknown): this;
    addComment(agentId: string, content: string, messageId?: string): TaskComment;
    toJSON(): TaskData & {
        isOpen: boolean;
        isBlocked: boolean;
        isOverdue: boolean;
    };
    toString(): string;
}
/**
 * Manages tasks within a workspace.
 */
export declare class TaskManager {
    private readonly _tasks;
    private readonly _byAssignee;
    private readonly _byChannel;
    /**
     * Create a new task.
     */
    create(data: {
        title: string;
        createdBy: string;
        description?: string;
        priority?: TaskPriority;
        assignedTo?: string;
        channelId?: string;
        dueAt?: Date;
        inputData?: Record<string, unknown>;
        tags?: string[];
    }): Task;
    /**
     * Add a task to the manager.
     */
    add(task: Task): Task;
    /**
     * Get a task by ID.
     */
    get(taskId: string): Task | undefined;
    /**
     * Get tasks assigned to an agent.
     */
    getByAssignee(agentId: string, options?: {
        openOnly?: boolean;
    }): Task[];
    /**
     * Get tasks in a channel.
     */
    getByChannel(channelId: string, options?: {
        openOnly?: boolean;
    }): Task[];
    /**
     * Get all pending (unassigned) tasks.
     */
    getPending(): Task[];
    /**
     * Get all blocked tasks.
     */
    getBlocked(): Task[];
    /**
     * Get all overdue tasks.
     */
    getOverdue(): Task[];
    /**
     * Get all tasks with a specific status.
     */
    getByStatus(status: TaskStatus): Task[];
    /**
     * Assign a task to an agent.
     */
    assign(taskId: string, agentId: string): Task | undefined;
    /**
     * List all tasks.
     */
    listAll(options?: {
        openOnly?: boolean;
        limit?: number;
    }): Task[];
    /**
     * Get task statistics.
     */
    getStats(): {
        total: number;
        open: number;
        completed: number;
        failed: number;
        blocked: number;
        overdue: number;
        byPriority: Record<TaskPriority, number>;
    };
}
//# sourceMappingURL=task.d.ts.map