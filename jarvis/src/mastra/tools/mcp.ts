/**
 * MCP (Model Context Protocol) server connections for Jarvis.
 *
 * MCP gives Jarvis access to external tool servers over a standardized
 * protocol. Each server exposes tools that the agent can use just like
 * native tools.
 *
 * Configured servers:
 *   - GitHub (via Copilot MCP) — repos, PRs, issues, commits
 *   - Filesystem — read/write files on disk
 *   - Fetch — make HTTP requests to any URL
 *
 * MCP servers are optional — if a token is missing, that server is skipped.
 */

import { MCPClient } from "@mastra/mcp";
import path from "node:path";

/**
 * Build the MCP client with all configured servers.
 *
 * Each server is only added if its required credentials are available.
 * This prevents startup failures when running without all integrations.
 */
function buildMCPServers(): Record<string, any> {
  const servers: Record<string, any> = {};

  // GitHub — repo management, PRs, issues, code search
  if (process.env.GITHUB_TOKEN) {
    servers.github = {
      url: new URL("https://api.githubcopilot.com/mcp"),
      requestInit: {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      },
    };
  }

  // Filesystem — scoped file access via MCP
  const workspaceDir = process.env.JARVIS_WORKSPACE || path.join(process.cwd(), "workspace");
  servers.filesystem = {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", workspaceDir],
  };

  // Fetch — HTTP requests for API calls, web scraping, webhooks
  servers.fetch = {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
  };

  return servers;
}

/**
 * Create the MCP client and get all available tools.
 *
 * Returns a flat record of tools from all connected MCP servers.
 * Designed to be spread into the agent's tools config.
 *
 * Usage:
 *   const mcpTools = await getMCPTools();
 *   new Agent({ tools: { ...mcpTools, ...otherTools } });
 */
export async function getMCPTools(): Promise<Record<string, any>> {
  const servers = buildMCPServers();

  if (Object.keys(servers).length === 0) {
    console.log("[Jarvis] No MCP servers configured");
    return {};
  }

  try {
    const mcp = new MCPClient({ servers });
    const tools = await mcp.listTools();

    const serverNames = Object.keys(servers);
    console.log(`[Jarvis] MCP servers connected: ${serverNames.join(", ")} (${Object.keys(tools).length} tools)`);

    return tools;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.warn(`[Jarvis] MCP initialization failed: ${error}`);
    return {};
  }
}
