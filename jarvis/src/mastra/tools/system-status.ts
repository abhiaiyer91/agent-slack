/**
 * System status tool — reports on the host system's health and resource usage.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { cpus, totalmem, freemem, uptime, hostname, platform, arch } from "node:os";

export const systemStatusTool = createTool({
  id: "system-status",
  description:
    "Check the current system status including CPU, memory, uptime, and platform info. Use this when the user asks about system health or resource usage.",
  inputSchema: z.object({
    detail: z
      .enum(["summary", "full"])
      .default("summary")
      .describe("Level of detail: 'summary' for key metrics, 'full' for everything"),
  }),
  outputSchema: z.object({
    hostname: z.string(),
    platform: z.string(),
    arch: z.string(),
    uptime: z.object({
      seconds: z.number(),
      human: z.string(),
    }),
    cpu: z.object({
      cores: z.number(),
      model: z.string(),
    }),
    memory: z.object({
      totalGB: z.number(),
      freeGB: z.number(),
      usedGB: z.number(),
      usagePercent: z.number(),
    }),
    node: z.object({
      version: z.string(),
    }),
  }),
  execute: async () => {
    const uptimeSecs = uptime();
    const hours = Math.floor(uptimeSecs / 3600);
    const minutes = Math.floor((uptimeSecs % 3600) / 60);

    const totalGB = Math.round((totalmem() / 1073741824) * 100) / 100;
    const freeGB = Math.round((freemem() / 1073741824) * 100) / 100;
    const usedGB = Math.round((totalGB - freeGB) * 100) / 100;
    const usagePercent = Math.round((usedGB / totalGB) * 10000) / 100;

    const cpuInfo = cpus();

    return {
      hostname: hostname(),
      platform: platform(),
      arch: arch(),
      uptime: {
        seconds: Math.round(uptimeSecs),
        human: `${hours}h ${minutes}m`,
      },
      cpu: {
        cores: cpuInfo.length,
        model: cpuInfo[0]?.model || "unknown",
      },
      memory: {
        totalGB,
        freeGB,
        usedGB,
        usagePercent,
      },
      node: {
        version: process.version,
      },
    };
  },
});
