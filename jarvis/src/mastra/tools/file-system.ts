/**
 * File system tool — read, write, and list files within the Jarvis workspace.
 *
 * All operations are sandboxed to JARVIS_WORKSPACE (default: ./workspace).
 * Path traversal is blocked.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { readFile, writeFile, readdir, mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

const WORKSPACE_ROOT = process.env.JARVIS_WORKSPACE || join(process.cwd(), "workspace");

function safePath(relativePath: string): string {
  const resolved = resolve(WORKSPACE_ROOT, relativePath);
  if (!resolved.startsWith(resolve(WORKSPACE_ROOT))) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }
  return resolved;
}

export const fileSystemTool = createTool({
  id: "file-system",
  description:
    "Read, write, and list files in the workspace. Use this for notes, documents, data files, and persistent storage. All paths are relative to the workspace root.",
  inputSchema: z.object({
    action: z
      .enum(["read", "write", "list", "exists"])
      .describe("The file operation to perform"),
    path: z
      .string()
      .describe("Relative path within the workspace (e.g., 'notes/todo.md')"),
    content: z
      .string()
      .optional()
      .describe("Content to write (required for 'write' action)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ action, path: relativePath, content }) => {
    try {
      const fullPath = safePath(relativePath);

      switch (action) {
        case "read": {
          const data = await readFile(fullPath, "utf-8");
          return { success: true, data };
        }

        case "write": {
          if (!content) {
            return { success: false, error: "Content is required for write action" };
          }
          const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
          if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
          }
          await writeFile(fullPath, content, "utf-8");
          return { success: true, data: `Written ${content.length} chars to ${relativePath}` };
        }

        case "list": {
          const targetPath = existsSync(fullPath)
            ? (await stat(fullPath)).isDirectory()
              ? fullPath
              : fullPath.substring(0, fullPath.lastIndexOf("/"))
            : WORKSPACE_ROOT;
          const entries = await readdir(targetPath, { withFileTypes: true });
          const listing = entries
            .map((e) => `${e.isDirectory() ? "d" : "f"} ${e.name}`)
            .join("\n");
          return { success: true, data: listing };
        }

        case "exists": {
          return { success: true, data: String(existsSync(fullPath)) };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  },
});
