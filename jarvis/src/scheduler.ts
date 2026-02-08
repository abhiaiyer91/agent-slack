/**
 * Jarvis Scheduler — proactive agent actions on a schedule.
 *
 * OpenClaw has cron jobs. We have something better: a scheduler that
 * can run any agent task on a cron pattern and deliver results to
 * any connected channel.
 *
 * This makes Jarvis proactive — not just reactive to messages.
 *
 * Usage:
 *   scheduler.add({
 *     id: "morning-briefing",
 *     cron: "0 8 * * 1-5",           // 8am weekdays
 *     task: async (agent) => {
 *       return agent.generate("Give me my daily briefing for New York");
 *     },
 *     deliver: async (result) => {
 *       await slackChannel.send({ recipientId: "#general", text: result.text });
 *     },
 *   });
 */

import type { Agent } from "@mastra/core/agent";

interface ScheduledTask {
  id: string;
  /** Cron pattern (e.g., "0 8 * * 1-5" for 8am weekdays) */
  cron: string;
  /** Description for logging */
  description?: string;
  /** The task to run — receives the agent, returns any result */
  task: (agent: Agent) => Promise<any>;
  /** Optional delivery — called with the task result */
  deliver?: (result: any) => Promise<void>;
  /** Whether this task is currently enabled */
  enabled: boolean;
}

interface ParsedCron {
  minutes: Set<number>;
  hours: Set<number>;
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>;
}

function parseCronField(field: string, min: number, max: number): Set<number> {
  const values = new Set<number>();

  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) values.add(i);
    } else if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr, 10);
      const start = range === "*" ? min : parseInt(range, 10);
      for (let i = start; i <= max; i += step) values.add(i);
    } else if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      for (let i = start; i <= end; i++) values.add(i);
    } else {
      values.add(parseInt(part, 10));
    }
  }

  return values;
}

function parseCron(pattern: string): ParsedCron {
  const parts = pattern.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Invalid cron: "${pattern}" (need 5 fields)`);

  return {
    minutes: parseCronField(parts[0], 0, 59),
    hours: parseCronField(parts[1], 0, 23),
    daysOfMonth: parseCronField(parts[2], 1, 31),
    months: parseCronField(parts[3], 1, 12),
    daysOfWeek: parseCronField(parts[4], 0, 6),
  };
}

function matchesCron(cron: ParsedCron, date: Date): boolean {
  return (
    cron.minutes.has(date.getMinutes()) &&
    cron.hours.has(date.getHours()) &&
    cron.daysOfMonth.has(date.getDate()) &&
    cron.months.has(date.getMonth() + 1) &&
    cron.daysOfWeek.has(date.getDay())
  );
}

export class Scheduler {
  private tasks = new Map<string, ScheduledTask & { parsed: ParsedCron }>();
  private interval: NodeJS.Timeout | null = null;
  private agent: Agent;
  private lastCheck = -1;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  /** Add a scheduled task */
  add(task: ScheduledTask): void {
    const parsed = parseCron(task.cron);
    this.tasks.set(task.id, { ...task, parsed });
    console.log(`[Jarvis Scheduler] Added: ${task.id} (${task.cron})${task.description ? ` — ${task.description}` : ""}`);
  }

  /** Remove a scheduled task */
  remove(id: string): boolean {
    const removed = this.tasks.delete(id);
    if (removed) console.log(`[Jarvis Scheduler] Removed: ${id}`);
    return removed;
  }

  /** List all tasks */
  list(): Array<{ id: string; cron: string; description?: string; enabled: boolean }> {
    return Array.from(this.tasks.values()).map((t) => ({
      id: t.id,
      cron: t.cron,
      description: t.description,
      enabled: t.enabled,
    }));
  }

  /** Start the scheduler — checks every 60 seconds */
  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => this.tick(), 60_000);
    this.interval.unref(); // Don't prevent process exit

    console.log(`[Jarvis Scheduler] Started with ${this.tasks.size} task(s)`);
  }

  /** Stop the scheduler */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("[Jarvis Scheduler] Stopped");
  }

  /** Run one check cycle */
  private async tick(): Promise<void> {
    const now = new Date();
    const currentMinute = now.getHours() * 60 + now.getMinutes();

    // Prevent running twice in the same minute
    if (currentMinute === this.lastCheck) return;
    this.lastCheck = currentMinute;

    for (const [id, task] of this.tasks) {
      if (!task.enabled) continue;

      if (matchesCron(task.parsed, now)) {
        console.log(`[Jarvis Scheduler] Running: ${id}`);
        try {
          const result = await task.task(this.agent);
          if (task.deliver) {
            await task.deliver(result);
          }
          console.log(`[Jarvis Scheduler] Completed: ${id}`);
        } catch (err) {
          console.error(`[Jarvis Scheduler] Failed: ${id}`, err instanceof Error ? err.message : err);
        }
      }
    }
  }
}
