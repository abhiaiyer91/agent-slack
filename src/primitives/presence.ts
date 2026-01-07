/**
 * Presence Primitive
 *
 * Presence tracks agent availability and activity. Unlike human users,
 * agent presence is more meaningful - it signals actual capacity to
 * handle work.
 */

import { z } from 'zod';

/**
 * Agent presence status.
 */
export const PresenceStatus = {
  ONLINE: 'online',       // Ready to receive and process messages
  BUSY: 'busy',           // Processing something, may be slow
  AWAY: 'away',           // Not actively monitoring
  OFFLINE: 'offline',     // Not running / unavailable
  DND: 'dnd',             // Do not disturb - not accepting new work
} as const;

export type PresenceStatus = (typeof PresenceStatus)[keyof typeof PresenceStatus];

export const PresenceSchema = z.object({
  agentId: z.string(),
  status: z.enum(['online', 'busy', 'away', 'offline', 'dnd']),
  statusMessage: z.string().default(''),
  lastActivity: z.date().optional(),
  lastStatusChange: z.date().optional(),
  currentWorkload: z.number().default(0),
  maxWorkload: z.number().default(5),
  expiresAt: z.date().optional(),
});

export type PresenceData = z.infer<typeof PresenceSchema>;

/**
 * An agent's presence state.
 */
export class Presence {
  readonly agentId: string;
  status: PresenceStatus;
  statusMessage: string;
  lastActivity?: Date;
  lastStatusChange?: Date;
  currentWorkload: number;
  maxWorkload: number;
  expiresAt?: Date;

  private readonly heartbeatIntervalMs: number;

  constructor(data: Partial<PresenceData> & { agentId: string }, heartbeatIntervalMs = 30000) {
    this.agentId = data.agentId;
    this.status = data.status ?? PresenceStatus.OFFLINE;
    this.statusMessage = data.statusMessage ?? '';
    this.lastActivity = data.lastActivity;
    this.lastStatusChange = data.lastStatusChange;
    this.currentWorkload = data.currentWorkload ?? 0;
    this.maxWorkload = data.maxWorkload ?? 5;
    this.expiresAt = data.expiresAt;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
  }

  /**
   * Check if agent is available for new work.
   */
  get isAvailable(): boolean {
    if (this.status !== PresenceStatus.ONLINE && this.status !== PresenceStatus.BUSY) {
      return false;
    }
    return this.hasCapacity;
  }

  /**
   * Check if agent has capacity for more work.
   */
  get hasCapacity(): boolean {
    return this.currentWorkload < this.maxWorkload;
  }

  /**
   * How many more tasks can this agent take.
   */
  get capacityRemaining(): number {
    return Math.max(0, this.maxWorkload - this.currentWorkload);
  }

  /**
   * Check if presence has expired (heartbeat missed).
   */
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * Get status, accounting for expiration.
   */
  get effectiveStatus(): PresenceStatus {
    if (this.isExpired) {
      return PresenceStatus.OFFLINE;
    }
    return this.status;
  }

  /**
   * Update presence status.
   */
  setStatus(status: PresenceStatus, message = ''): this {
    this.status = status;
    this.statusMessage = message;
    this.lastStatusChange = new Date();
    this.refreshExpiration();
    return this;
  }

  /**
   * Set agent as online and ready.
   */
  goOnline(message = ''): this {
    return this.setStatus(PresenceStatus.ONLINE, message);
  }

  /**
   * Set agent as busy.
   */
  goBusy(message = ''): this {
    return this.setStatus(PresenceStatus.BUSY, message);
  }

  /**
   * Set agent as offline.
   */
  goOffline(): this {
    return this.setStatus(PresenceStatus.OFFLINE);
  }

  /**
   * Record a heartbeat to keep presence alive.
   */
  heartbeat(): this {
    this.lastActivity = new Date();
    this.refreshExpiration();
    return this;
  }

  /**
   * Record that the agent did something.
   */
  recordActivity(): this {
    this.lastActivity = new Date();
    this.refreshExpiration();
    return this;
  }

  /**
   * Increment workload (started a task).
   */
  incrementWorkload(): this {
    this.currentWorkload += 1;
    this.recordActivity();

    // Auto-set to busy if at capacity
    if (!this.hasCapacity && this.status === PresenceStatus.ONLINE) {
      this.status = PresenceStatus.BUSY;
      this.statusMessage = 'At capacity';
    }

    return this;
  }

  /**
   * Decrement workload (finished a task).
   */
  decrementWorkload(): this {
    this.currentWorkload = Math.max(0, this.currentWorkload - 1);
    this.recordActivity();

    // Auto-set back to online if was at capacity
    if (this.hasCapacity && this.status === PresenceStatus.BUSY) {
      if (this.statusMessage.toLowerCase().includes('capacity')) {
        this.status = PresenceStatus.ONLINE;
        this.statusMessage = '';
      }
    }

    return this;
  }

  private refreshExpiration(): void {
    this.expiresAt = new Date(Date.now() + this.heartbeatIntervalMs);
  }

  toJSON(): PresenceData {
    return {
      agentId: this.agentId,
      status: this.effectiveStatus,
      statusMessage: this.statusMessage,
      lastActivity: this.lastActivity,
      lastStatusChange: this.lastStatusChange,
      currentWorkload: this.currentWorkload,
      maxWorkload: this.maxWorkload,
      expiresAt: this.expiresAt,
    };
  }

  toString(): string {
    const statusIcons: Record<PresenceStatus, string> = {
      online: '🟢',
      busy: '🟡',
      away: '🟠',
      offline: '⚫',
      dnd: '🔴',
    };
    const icon = statusIcons[this.effectiveStatus];
    const msg = this.statusMessage ? ` - ${this.statusMessage}` : '';
    const capacity = ` [${this.currentWorkload}/${this.maxWorkload}]`;
    return `${icon} ${this.agentId.slice(0, 12)}${capacity}${msg}`;
  }
}

/**
 * Manages presence for all agents in a workspace.
 */
export class PresenceManager {
  private readonly _presences: Map<string, Presence> = new Map();
  private readonly defaultHeartbeatIntervalMs: number;

  constructor(heartbeatIntervalMs = 30000) {
    this.defaultHeartbeatIntervalMs = heartbeatIntervalMs;
  }

  /**
   * Get or create presence for an agent.
   */
  getOrCreate(agentId: string): Presence {
    if (!this._presences.has(agentId)) {
      this._presences.set(agentId, new Presence({ agentId }, this.defaultHeartbeatIntervalMs));
    }
    return this._presences.get(agentId)!;
  }

  /**
   * Get presence for an agent.
   */
  get(agentId: string): Presence | undefined {
    return this._presences.get(agentId);
  }

  /**
   * Update an agent's presence.
   */
  update(agentId: string, status: PresenceStatus, message = ''): Presence {
    const presence = this.getOrCreate(agentId);
    presence.setStatus(status, message);
    return presence;
  }

  /**
   * Record a heartbeat for an agent.
   */
  heartbeat(agentId: string): Presence {
    const presence = this.getOrCreate(agentId);
    presence.heartbeat();
    return presence;
  }

  /**
   * Get all agents that are online (not offline/DND).
   */
  getOnlineAgents(): string[] {
    return Array.from(this._presences.values())
      .filter((p) => p.effectiveStatus === PresenceStatus.ONLINE || p.effectiveStatus === PresenceStatus.BUSY)
      .map((p) => p.agentId);
  }

  /**
   * Get all agents that are available for new work.
   */
  getAvailableAgents(): string[] {
    return Array.from(this._presences.values())
      .filter((p) => p.isAvailable)
      .map((p) => p.agentId);
  }

  /**
   * Get all agents with a specific status.
   */
  getByStatus(status: PresenceStatus): string[] {
    return Array.from(this._presences.values())
      .filter((p) => p.effectiveStatus === status)
      .map((p) => p.agentId);
  }

  /**
   * Mark expired presences as offline.
   * Returns list of agent IDs that were marked offline.
   */
  cleanupExpired(): string[] {
    const expired: string[] = [];
    for (const presence of this._presences.values()) {
      if (presence.isExpired && presence.status !== PresenceStatus.OFFLINE) {
        presence.status = PresenceStatus.OFFLINE;
        presence.statusMessage = 'Heartbeat timeout';
        expired.push(presence.agentId);
      }
    }
    return expired;
  }

  /**
   * Get all presence records.
   */
  getAll(): Presence[] {
    return Array.from(this._presences.values());
  }

  toJSON() {
    return {
      onlineCount: this.getOnlineAgents().length,
      availableCount: this.getAvailableAgents().length,
      presences: Object.fromEntries(
        Array.from(this._presences.entries()).map(([id, p]) => [id, p.toJSON()])
      ),
    };
  }
}
