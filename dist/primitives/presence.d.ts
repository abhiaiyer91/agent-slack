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
export declare const PresenceStatus: {
    readonly ONLINE: "online";
    readonly BUSY: "busy";
    readonly AWAY: "away";
    readonly OFFLINE: "offline";
    readonly DND: "dnd";
};
export type PresenceStatus = (typeof PresenceStatus)[keyof typeof PresenceStatus];
export declare const PresenceSchema: z.ZodObject<{
    agentId: z.ZodString;
    status: z.ZodEnum<["online", "busy", "away", "offline", "dnd"]>;
    statusMessage: z.ZodDefault<z.ZodString>;
    lastActivity: z.ZodOptional<z.ZodDate>;
    lastStatusChange: z.ZodOptional<z.ZodDate>;
    currentWorkload: z.ZodDefault<z.ZodNumber>;
    maxWorkload: z.ZodDefault<z.ZodNumber>;
    expiresAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    status: "online" | "busy" | "away" | "offline" | "dnd";
    agentId: string;
    statusMessage: string;
    currentWorkload: number;
    maxWorkload: number;
    lastActivity?: Date | undefined;
    lastStatusChange?: Date | undefined;
    expiresAt?: Date | undefined;
}, {
    status: "online" | "busy" | "away" | "offline" | "dnd";
    agentId: string;
    statusMessage?: string | undefined;
    lastActivity?: Date | undefined;
    lastStatusChange?: Date | undefined;
    currentWorkload?: number | undefined;
    maxWorkload?: number | undefined;
    expiresAt?: Date | undefined;
}>;
export type PresenceData = z.infer<typeof PresenceSchema>;
/**
 * An agent's presence state.
 */
export declare class Presence {
    readonly agentId: string;
    status: PresenceStatus;
    statusMessage: string;
    lastActivity?: Date;
    lastStatusChange?: Date;
    currentWorkload: number;
    maxWorkload: number;
    expiresAt?: Date;
    private readonly heartbeatIntervalMs;
    constructor(data: Partial<PresenceData> & {
        agentId: string;
    }, heartbeatIntervalMs?: number);
    /**
     * Check if agent is available for new work.
     */
    get isAvailable(): boolean;
    /**
     * Check if agent has capacity for more work.
     */
    get hasCapacity(): boolean;
    /**
     * How many more tasks can this agent take.
     */
    get capacityRemaining(): number;
    /**
     * Check if presence has expired (heartbeat missed).
     */
    get isExpired(): boolean;
    /**
     * Get status, accounting for expiration.
     */
    get effectiveStatus(): PresenceStatus;
    /**
     * Update presence status.
     */
    setStatus(status: PresenceStatus, message?: string): this;
    /**
     * Set agent as online and ready.
     */
    goOnline(message?: string): this;
    /**
     * Set agent as busy.
     */
    goBusy(message?: string): this;
    /**
     * Set agent as offline.
     */
    goOffline(): this;
    /**
     * Record a heartbeat to keep presence alive.
     */
    heartbeat(): this;
    /**
     * Record that the agent did something.
     */
    recordActivity(): this;
    /**
     * Increment workload (started a task).
     */
    incrementWorkload(): this;
    /**
     * Decrement workload (finished a task).
     */
    decrementWorkload(): this;
    private refreshExpiration;
    toJSON(): PresenceData;
    toString(): string;
}
/**
 * Manages presence for all agents in a workspace.
 */
export declare class PresenceManager {
    private readonly _presences;
    private readonly defaultHeartbeatIntervalMs;
    constructor(heartbeatIntervalMs?: number);
    /**
     * Get or create presence for an agent.
     */
    getOrCreate(agentId: string): Presence;
    /**
     * Get presence for an agent.
     */
    get(agentId: string): Presence | undefined;
    /**
     * Update an agent's presence.
     */
    update(agentId: string, status: PresenceStatus, message?: string): Presence;
    /**
     * Record a heartbeat for an agent.
     */
    heartbeat(agentId: string): Presence;
    /**
     * Get all agents that are online (not offline/DND).
     */
    getOnlineAgents(): string[];
    /**
     * Get all agents that are available for new work.
     */
    getAvailableAgents(): string[];
    /**
     * Get all agents with a specific status.
     */
    getByStatus(status: PresenceStatus): string[];
    /**
     * Mark expired presences as offline.
     * Returns list of agent IDs that were marked offline.
     */
    cleanupExpired(): string[];
    /**
     * Get all presence records.
     */
    getAll(): Presence[];
    toJSON(): {
        onlineCount: number;
        availableCount: number;
        presences: {
            [k: string]: {
                status: "online" | "busy" | "away" | "offline" | "dnd";
                agentId: string;
                statusMessage: string;
                currentWorkload: number;
                maxWorkload: number;
                lastActivity?: Date | undefined;
                lastStatusChange?: Date | undefined;
                expiresAt?: Date | undefined;
            };
        };
    };
}
//# sourceMappingURL=presence.d.ts.map