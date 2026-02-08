/**
 * MCP (Model Context Protocol) server connections for Jarvis.
 *
 * Servers are only added if their dependencies are available.
 * MCP init is optional — if it fails, the agent works without MCP tools.
 */

import { MCPClient } from "@mastra/mcp";

/**
 * Build MCP servers based on available credentials.
 */
function buildMCPServers(): Record<string, any> {
  const servers: Record<string, any> = {};

  // GitHub — only if token is available
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

  return servers;
}

/**
 * Create the MCP client and get all available tools.
 */
export async function getMCPTools(): Promise<Record<string, any>> {
  const servers = buildMCPServers();

  if (Object.keys(servers).length === 0) {
    return {};
  }

  try {
    const mcp = new MCPClient({ servers });
    const tools = await mcp.listTools();
    console.log(`[Jarvis] MCP: ${Object.keys(tools).length} tools from ${Object.keys(servers).join(", ")}`);
    return tools;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.warn(`[Jarvis] MCP init failed: ${error}`);
    return {};
  }
}
