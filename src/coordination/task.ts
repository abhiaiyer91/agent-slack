/**
 * Task Primitive
 *
 * Tasks are units of work that agents can assign to each other.
 * They provide structure beyond simple messages - tracking state,
 * ownership, deadlines, and completion.
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';

/**
 * Status of a task.
 */
export const TaskStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  IN_REVIEW: 'in_review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

/**
 * Priority levels for tasks.
 */
export const TaskPriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  BACKGROUND: 'background',
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  createdBy: z.string(),
  assignedTo: z.string().optional(),
  reviewers: z.array(z.string()).default([]),
  status: z.enum(['pending', 'assigned', 'in_progress', 'blocked', 'in_review', 'completed', 'cancelled', 'failed']),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'background']),
  channelId: z.string().optional(),
  threadId: z.string().optional(),
  sourceMessageId: z.string().optional(),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  dueAt: z.date().optional(),
  progressPercent: z.number().min(0).max(100).default(0),
  statusMessage: z.string().default(''),
  inputData: z.record(z.unknown()).default({}),
  outputData: z.record(z.unknown()).default({}),
  blockedBy: z.array(z.string()).default([]),
  blocks: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

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
export class Task {
  readonly id: string;
  title: string;
  description: string;

  // Ownership
  readonly createdBy: string;
  assignedTo?: string;
  reviewers: string[];

  // Status
  status: TaskStatus;
  priority: TaskPriority;

  // Context links
  channelId?: string;
  threadId?: string;
  sourceMessageId?: string;

  // Timing
  readonly createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dueAt?: Date;

  // Progress
  progressPercent: number;
  statusMessage: string;

  // Input/Output
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;

  // Dependencies
  blockedBy: string[];
  blocks: string[];

  // History
  readonly comments: TaskComment[];

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;

  constructor(data: Partial<TaskData> & { title: string; createdBy: string }) {
    this.id = data.id ?? nanoid();
    this.title = data.title;
    this.description = data.description ?? '';
    this.createdBy = data.createdBy;
    this.assignedTo = data.assignedTo;
    this.reviewers = data.reviewers ?? [];
    this.status = data.status ?? TaskStatus.PENDING;
    this.priority = data.priority ?? TaskPriority.MEDIUM;
    this.channelId = data.channelId;
    this.threadId = data.threadId;
    this.sourceMessageId = data.sourceMessageId;
    this.createdAt = data.createdAt ?? new Date();
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.dueAt = data.dueAt;
    this.progressPercent = data.progressPercent ?? 0;
    this.statusMessage = data.statusMessage ?? '';
    this.inputData = data.inputData ?? {};
    this.outputData = data.outputData ?? {};
    this.blockedBy = data.blockedBy ?? [];
    this.blocks = data.blocks ?? [];
    this.comments = [];
    this.tags = data.tags ?? [];
    this.metadata = {};
  }

  get isOpen(): boolean {
    return (
      this.status !== TaskStatus.COMPLETED &&
      this.status !== TaskStatus.CANCELLED &&
      this.status !== TaskStatus.FAILED
    );
  }

  get isBlocked(): boolean {
    return this.status === TaskStatus.BLOCKED || this.blockedBy.length > 0;
  }

  get isOverdue(): boolean {
    if (!this.dueAt) return false;
    return new Date() > this.dueAt && this.isOpen;
  }

  get duration(): number | undefined {
    if (this.startedAt && this.completedAt) {
      return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return undefined;
  }

  assign(agentId: string): this {
    this.assignedTo = agentId;
    this.status = TaskStatus.ASSIGNED;
    return this;
  }

  start(): this {
    this.status = TaskStatus.IN_PROGRESS;
    this.startedAt = new Date();
    return this;
  }

  updateProgress(percent: number, message = ''): this {
    this.progressPercent = Math.min(100, Math.max(0, percent));
    if (message) {
      this.statusMessage = message;
    }
    return this;
  }

  block(reason: string, blockedByTaskId?: string): this {
    this.status = TaskStatus.BLOCKED;
    this.statusMessage = reason;
    if (blockedByTaskId) {
      this.blockedBy.push(blockedByTaskId);
    }
    return this;
  }

  unblock(taskId?: string): this {
    if (taskId) {
      this.blockedBy = this.blockedBy.filter((id) => id !== taskId);
    }
    if (this.blockedBy.length === 0) {
      this.status = TaskStatus.IN_PROGRESS;
      this.statusMessage = '';
    }
    return this;
  }

  submitForReview(output?: Record<string, unknown>): this {
    this.status = TaskStatus.IN_REVIEW;
    if (output) {
      this.outputData = output;
    }
    this.progressPercent = 100;
    return this;
  }

  complete(output?: Record<string, unknown>): this {
    this.status = TaskStatus.COMPLETED;
    this.completedAt = new Date();
    this.progressPercent = 100;
    if (output) {
      this.outputData = output;
    }
    return this;
  }

  cancel(reason = ''): this {
    this.status = TaskStatus.CANCELLED;
    this.completedAt = new Date();
    this.statusMessage = reason;
    return this;
  }

  fail(reason = '', error?: unknown): this {
    this.status = TaskStatus.FAILED;
    this.completedAt = new Date();
    this.statusMessage = reason;
    if (error) {
      this.outputData.error = String(error);
    }
    return this;
  }

  addComment(agentId: string, content: string, messageId?: string): TaskComment {
    const comment: TaskComment = {
      id: nanoid(),
      agentId,
      content,
      createdAt: new Date(),
      messageId,
    };
    this.comments.push(comment);
    return comment;
  }

  toJSON(): TaskData & { isOpen: boolean; isBlocked: boolean; isOverdue: boolean } {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      createdBy: this.createdBy,
      assignedTo: this.assignedTo,
      reviewers: this.reviewers,
      status: this.status,
      priority: this.priority,
      channelId: this.channelId,
      threadId: this.threadId,
      sourceMessageId: this.sourceMessageId,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      dueAt: this.dueAt,
      progressPercent: this.progressPercent,
      statusMessage: this.statusMessage,
      inputData: this.inputData,
      outputData: this.outputData,
      blockedBy: this.blockedBy,
      blocks: this.blocks,
      tags: this.tags,
      isOpen: this.isOpen,
      isBlocked: this.isBlocked,
      isOverdue: this.isOverdue,
    };
  }

  toString(): string {
    const statusIcons: Record<TaskStatus, string> = {
      pending: '⏸️',
      assigned: '📋',
      in_progress: '🔄',
      blocked: '🚫',
      in_review: '👀',
      completed: '✅',
      cancelled: '❌',
      failed: '💥',
    };
    const icon = statusIcons[this.status];
    const assignee = this.assignedTo ? ` -> ${this.assignedTo.slice(0, 8)}` : '';
    return `${icon} [${this.priority}] ${this.title}${assignee}`;
  }
}

/**
 * Manages tasks within a workspace.
 */
export class TaskManager {
  private readonly _tasks: Map<string, Task> = new Map();
  private readonly _byAssignee: Map<string, string[]> = new Map();
  private readonly _byChannel: Map<string, string[]> = new Map();

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
  }): Task {
    const task = new Task({
      ...data,
      priority: data.priority ?? TaskPriority.MEDIUM,
    });

    if (data.assignedTo) {
      task.status = TaskStatus.ASSIGNED;
    }

    return this.add(task);
  }

  /**
   * Add a task to the manager.
   */
  add(task: Task): Task {
    this._tasks.set(task.id, task);

    // Index by assignee
    if (task.assignedTo) {
      if (!this._byAssignee.has(task.assignedTo)) {
        this._byAssignee.set(task.assignedTo, []);
      }
      this._byAssignee.get(task.assignedTo)!.push(task.id);
    }

    // Index by channel
    if (task.channelId) {
      if (!this._byChannel.has(task.channelId)) {
        this._byChannel.set(task.channelId, []);
      }
      this._byChannel.get(task.channelId)!.push(task.id);
    }

    return task;
  }

  /**
   * Get a task by ID.
   */
  get(taskId: string): Task | undefined {
    return this._tasks.get(taskId);
  }

  /**
   * Get tasks assigned to an agent.
   */
  getByAssignee(agentId: string, options: { openOnly?: boolean } = {}): Task[] {
    const taskIds = this._byAssignee.get(agentId) ?? [];
    let tasks = taskIds.map((id) => this._tasks.get(id)!).filter(Boolean);

    if (options.openOnly !== false) {
      tasks = tasks.filter((t) => t.isOpen);
    }

    return tasks.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, background: 4 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get tasks in a channel.
   */
  getByChannel(channelId: string, options: { openOnly?: boolean } = {}): Task[] {
    const taskIds = this._byChannel.get(channelId) ?? [];
    let tasks = taskIds.map((id) => this._tasks.get(id)!).filter(Boolean);

    if (options.openOnly !== false) {
      tasks = tasks.filter((t) => t.isOpen);
    }

    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all pending (unassigned) tasks.
   */
  getPending(): Task[] {
    return Array.from(this._tasks.values()).filter((t) => t.status === TaskStatus.PENDING);
  }

  /**
   * Get all blocked tasks.
   */
  getBlocked(): Task[] {
    return Array.from(this._tasks.values()).filter((t) => t.isBlocked);
  }

  /**
   * Get all overdue tasks.
   */
  getOverdue(): Task[] {
    return Array.from(this._tasks.values()).filter((t) => t.isOverdue);
  }

  /**
   * Get all tasks with a specific status.
   */
  getByStatus(status: TaskStatus): Task[] {
    return Array.from(this._tasks.values()).filter((t) => t.status === status);
  }

  /**
   * Assign a task to an agent.
   */
  assign(taskId: string, agentId: string): Task | undefined {
    const task = this.get(taskId);
    if (!task) return undefined;

    // Remove from old assignee index
    if (task.assignedTo && this._byAssignee.has(task.assignedTo)) {
      const tasks = this._byAssignee.get(task.assignedTo)!;
      const idx = tasks.indexOf(taskId);
      if (idx !== -1) tasks.splice(idx, 1);
    }

    // Add to new assignee index
    if (!this._byAssignee.has(agentId)) {
      this._byAssignee.set(agentId, []);
    }
    this._byAssignee.get(agentId)!.push(taskId);

    task.assign(agentId);
    return task;
  }

  /**
   * List all tasks.
   */
  listAll(options: { openOnly?: boolean; limit?: number } = {}): Task[] {
    const { openOnly = false, limit = 100 } = options;

    let tasks = Array.from(this._tasks.values());

    if (openOnly) {
      tasks = tasks.filter((t) => t.isOpen);
    }

    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return tasks.slice(0, limit);
  }

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
  } {
    const allTasks = Array.from(this._tasks.values());

    return {
      total: allTasks.length,
      open: allTasks.filter((t) => t.isOpen).length,
      completed: allTasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
      failed: allTasks.filter((t) => t.status === TaskStatus.FAILED).length,
      blocked: allTasks.filter((t) => t.isBlocked).length,
      overdue: allTasks.filter((t) => t.isOverdue).length,
      byPriority: {
        critical: allTasks.filter((t) => t.priority === TaskPriority.CRITICAL).length,
        high: allTasks.filter((t) => t.priority === TaskPriority.HIGH).length,
        medium: allTasks.filter((t) => t.priority === TaskPriority.MEDIUM).length,
        low: allTasks.filter((t) => t.priority === TaskPriority.LOW).length,
        background: allTasks.filter((t) => t.priority === TaskPriority.BACKGROUND).length,
      },
    };
  }
}
