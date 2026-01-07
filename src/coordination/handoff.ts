/**
 * Handoff Primitive
 *
 * Handoffs are how agents pass work or context to each other.
 * They're more structured than just posting a message - they include
 * context, expectations, and acknowledgment.
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';

/**
 * Why work is being handed off.
 */
export const HandoffReason = {
  // Capability-based
  CAPABILITY_NEEDED: 'capability_needed',
  BETTER_SUITED: 'better_suited',

  // Workload-based
  AT_CAPACITY: 'at_capacity',
  LOAD_BALANCING: 'load_balancing',

  // Process-based
  NEXT_STEP: 'next_step',
  REVIEW_NEEDED: 'review_needed',
  APPROVAL_NEEDED: 'approval_needed',

  // Issue-based
  STUCK: 'stuck',
  ERROR: 'error',
  ESCALATION: 'escalation',

  // Completion
  COMPLETED: 'completed',
} as const;

export type HandoffReason = (typeof HandoffReason)[keyof typeof HandoffReason];

/**
 * Status of a handoff.
 */
export const HandoffStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

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

export const HandoffSchema = z.object({
  id: z.string(),
  fromAgent: z.string(),
  toAgent: z.string().optional(),
  toCapability: z.string().optional(),
  reason: z.enum([
    'capability_needed', 'better_suited', 'at_capacity', 'load_balancing',
    'next_step', 'review_needed', 'approval_needed',
    'stuck', 'error', 'escalation', 'completed',
  ]),
  status: z.enum(['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled', 'expired']),
  channelId: z.string().optional(),
  threadId: z.string().optional(),
  isUrgent: z.boolean().default(false),
  createdAt: z.date(),
  acceptedAt: z.date().optional(),
  completedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  acceptedBy: z.string().optional(),
  rejectionReason: z.string().default(''),
  completionNotes: z.string().default(''),
});

export type HandoffData = z.infer<typeof HandoffSchema>;

/**
 * A handoff of work from one agent to another.
 */
export class Handoff {
  readonly id: string;

  // Participants
  readonly fromAgent: string;
  readonly toAgent?: string;
  readonly toCapability?: string;

  // Reason and context
  readonly reason: HandoffReason;
  readonly context: HandoffContext;

  // Status
  status: HandoffStatus;

  // Location
  channelId?: string;
  threadId?: string;

  // Timing
  readonly createdAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;

  // Response
  acceptedBy?: string;
  rejectionReason: string;
  completionNotes: string;

  // Priority
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
  }) {
    if (!data.toAgent && !data.toCapability) {
      throw new Error('Must specify either toAgent or toCapability');
    }

    this.id = nanoid();
    this.fromAgent = data.fromAgent;
    this.toAgent = data.toAgent;
    this.toCapability = data.toCapability;
    this.reason = data.reason;
    this.context = data.context;
    this.status = HandoffStatus.PENDING;
    this.channelId = data.channelId;
    this.createdAt = new Date();
    this.expiresAt = data.expiresAt;
    this.isUrgent = data.isUrgent ?? false;
    this.rejectionReason = '';
    this.completionNotes = '';
  }

  get isOpen(): boolean {
    return (
      this.status === HandoffStatus.PENDING ||
      this.status === HandoffStatus.ACCEPTED ||
      this.status === HandoffStatus.IN_PROGRESS
    );
  }

  get isTargeted(): boolean {
    return this.toAgent !== undefined;
  }

  get isExpired(): boolean {
    if (this.expiresAt && new Date() > this.expiresAt) {
      return true;
    }
    return this.status === HandoffStatus.EXPIRED;
  }

  accept(agentId: string): this {
    this.status = HandoffStatus.ACCEPTED;
    this.acceptedBy = agentId;
    this.acceptedAt = new Date();
    return this;
  }

  reject(_agentId: string, reason = ''): this {
    this.status = HandoffStatus.REJECTED;
    this.rejectionReason = reason;
    return this;
  }

  start(): this {
    this.status = HandoffStatus.IN_PROGRESS;
    return this;
  }

  complete(notes = ''): this {
    this.status = HandoffStatus.COMPLETED;
    this.completedAt = new Date();
    this.completionNotes = notes;
    return this;
  }

  cancel(): this {
    this.status = HandoffStatus.CANCELLED;
    return this;
  }

  expire(): this {
    this.status = HandoffStatus.EXPIRED;
    return this;
  }

  toJSON(): HandoffData & { context: HandoffContext; isOpen: boolean; isTargeted: boolean } {
    return {
      id: this.id,
      fromAgent: this.fromAgent,
      toAgent: this.toAgent,
      toCapability: this.toCapability,
      reason: this.reason,
      status: this.status,
      context: this.context,
      channelId: this.channelId,
      threadId: this.threadId,
      isUrgent: this.isUrgent,
      isOpen: this.isOpen,
      isTargeted: this.isTargeted,
      createdAt: this.createdAt,
      acceptedAt: this.acceptedAt,
      completedAt: this.completedAt,
      expiresAt: this.expiresAt,
      acceptedBy: this.acceptedBy,
      rejectionReason: this.rejectionReason,
      completionNotes: this.completionNotes,
    };
  }

  toString(): string {
    const statusIcons: Record<HandoffStatus, string> = {
      pending: '⏳',
      accepted: '🤝',
      rejected: '❌',
      in_progress: '🔄',
      completed: '✅',
      cancelled: '🚫',
      expired: '⏰',
    };
    const icon = statusIcons[this.status];
    const target = this.toAgent ?? `[${this.toCapability}]`;
    const urgent = this.isUrgent ? '🚨 ' : '';
    return `${urgent}${icon} ${this.fromAgent.slice(0, 8)} -> ${target}: ${this.reason}`;
  }
}

/**
 * Manages handoffs within a workspace.
 */
export class HandoffManager {
  private readonly _handoffs: Map<string, Handoff> = new Map();
  private readonly _bySender: Map<string, string[]> = new Map();
  private readonly _byRecipient: Map<string, string[]> = new Map();
  private readonly _pendingByCapability: Map<string, string[]> = new Map();

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
  }): Handoff {
    const handoff = new Handoff(data);
    return this.add(handoff);
  }

  /**
   * Add a handoff to the manager.
   */
  add(handoff: Handoff): Handoff {
    this._handoffs.set(handoff.id, handoff);

    // Index by sender
    if (!this._bySender.has(handoff.fromAgent)) {
      this._bySender.set(handoff.fromAgent, []);
    }
    this._bySender.get(handoff.fromAgent)!.push(handoff.id);

    // Index by recipient
    if (handoff.toAgent) {
      if (!this._byRecipient.has(handoff.toAgent)) {
        this._byRecipient.set(handoff.toAgent, []);
      }
      this._byRecipient.get(handoff.toAgent)!.push(handoff.id);
    }

    // Index by capability (for open handoffs)
    if (handoff.toCapability) {
      if (!this._pendingByCapability.has(handoff.toCapability)) {
        this._pendingByCapability.set(handoff.toCapability, []);
      }
      this._pendingByCapability.get(handoff.toCapability)!.push(handoff.id);
    }

    return handoff;
  }

  /**
   * Get a handoff by ID.
   */
  get(handoffId: string): Handoff | undefined {
    return this._handoffs.get(handoffId);
  }

  /**
   * Get pending handoffs targeted at an agent.
   */
  getPendingForAgent(agentId: string): Handoff[] {
    const handoffIds = this._byRecipient.get(agentId) ?? [];
    return handoffIds
      .map((id) => this._handoffs.get(id)!)
      .filter((h) => h && h.status === HandoffStatus.PENDING);
  }

  /**
   * Get pending handoffs for a capability.
   */
  getPendingForCapability(capability: string): Handoff[] {
    const handoffIds = this._pendingByCapability.get(capability) ?? [];
    return handoffIds
      .map((id) => this._handoffs.get(id)!)
      .filter((h) => h && h.status === HandoffStatus.PENDING);
  }

  /**
   * Get handoffs sent by an agent.
   */
  getSentBy(agentId: string, options: { openOnly?: boolean } = {}): Handoff[] {
    const handoffIds = this._bySender.get(agentId) ?? [];
    let handoffs = handoffIds.map((id) => this._handoffs.get(id)!).filter(Boolean);

    if (options.openOnly !== false) {
      handoffs = handoffs.filter((h) => h.isOpen);
    }

    return handoffs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Accept a handoff.
   */
  accept(handoffId: string, agentId: string): Handoff | undefined {
    const handoff = this.get(handoffId);
    if (!handoff || handoff.status !== HandoffStatus.PENDING) {
      return undefined;
    }

    handoff.accept(agentId);

    // Update recipient index
    if (!this._byRecipient.has(agentId)) {
      this._byRecipient.set(agentId, []);
    }
    this._byRecipient.get(agentId)!.push(handoffId);

    // Remove from capability index
    if (handoff.toCapability && this._pendingByCapability.has(handoff.toCapability)) {
      const ids = this._pendingByCapability.get(handoff.toCapability)!;
      const idx = ids.indexOf(handoffId);
      if (idx !== -1) ids.splice(idx, 1);
    }

    return handoff;
  }

  /**
   * Reject a handoff.
   */
  reject(handoffId: string, agentId: string, reason = ''): Handoff | undefined {
    const handoff = this.get(handoffId);
    if (!handoff || handoff.status !== HandoffStatus.PENDING) {
      return undefined;
    }

    handoff.reject(agentId, reason);
    return handoff;
  }

  /**
   * Complete a handoff.
   */
  complete(handoffId: string, notes = ''): Handoff | undefined {
    const handoff = this.get(handoffId);
    if (!handoff) return undefined;

    handoff.complete(notes);
    return handoff;
  }

  /**
   * Mark expired handoffs.
   */
  cleanupExpired(): string[] {
    const expired: string[] = [];
    const now = new Date();

    for (const handoff of this._handoffs.values()) {
      if (handoff.isOpen && handoff.expiresAt && now > handoff.expiresAt) {
        handoff.expire();
        expired.push(handoff.id);
      }
    }

    return expired;
  }

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
  } {
    const allHandoffs = Array.from(this._handoffs.values());

    const byReason = {} as Record<HandoffReason, number>;
    for (const reason of Object.values(HandoffReason)) {
      byReason[reason] = allHandoffs.filter((h) => h.reason === reason).length;
    }

    return {
      total: allHandoffs.length,
      pending: allHandoffs.filter((h) => h.status === HandoffStatus.PENDING).length,
      inProgress: allHandoffs.filter((h) => h.status === HandoffStatus.IN_PROGRESS).length,
      completed: allHandoffs.filter((h) => h.status === HandoffStatus.COMPLETED).length,
      rejected: allHandoffs.filter((h) => h.status === HandoffStatus.REJECTED).length,
      byReason,
    };
  }
}
