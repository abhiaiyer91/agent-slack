/**
 * GitHub PR Review Workflow
 *
 * Triggered via webhook when a PR is opened or updated.
 * Steps:
 *   1. Fetch PR metadata + diff from GitHub API
 *   2. Agent reviews the diff (code quality, bugs, suggestions)
 *   3. Post review comment on the PR
 *
 * Requires: GITHUB_TOKEN with repo access
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Schemas
const prInputSchema = z.object({
  owner: z.string().describe("Repository owner (e.g., 'acme')"),
  repo: z.string().describe("Repository name (e.g., 'webapp')"),
  prNumber: z.number().describe("Pull request number"),
});

const prDataSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  prNumber: z.number(),
  title: z.string(),
  body: z.string(),
  author: z.string(),
  diff: z.string(),
  changedFiles: z.number(),
  additions: z.number(),
  deletions: z.number(),
});

const reviewSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  prNumber: z.number(),
  summary: z.string(),
  issues: z.array(z.object({
    severity: z.enum(["critical", "warning", "suggestion", "praise"]),
    description: z.string(),
    file: z.string().optional(),
  })),
  verdict: z.enum(["approve", "request-changes", "comment"]),
});

const postResultSchema = z.object({
  posted: z.boolean(),
  url: z.string().optional(),
  error: z.string().optional(),
});

// Step 1: Fetch PR data from GitHub
const fetchPRStep = createStep({
  id: "fetch-pr",
  description: "Fetch PR metadata and diff from GitHub API",
  inputSchema: prInputSchema,
  outputSchema: prDataSchema,
  execute: async ({ inputData }) => {
    const { owner, repo, prNumber } = inputData;
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error("GITHUB_TOKEN not set");
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Jarvis/1.0",
    };

    // Fetch PR metadata
    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!prRes.ok) throw new Error(`GitHub API: ${prRes.status} ${prRes.statusText}`);
    const prData = await prRes.json() as any;

    // Fetch diff
    const diffRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
      headers: { ...headers, Accept: "application/vnd.github.v3.diff" },
      signal: AbortSignal.timeout(10000),
    });

    const diff = diffRes.ok ? (await diffRes.text()).slice(0, 10000) : "[diff unavailable]";

    return {
      owner,
      repo,
      prNumber,
      title: prData.title || "",
      body: (prData.body || "").slice(0, 2000),
      author: prData.user?.login || "unknown",
      diff,
      changedFiles: prData.changed_files || 0,
      additions: prData.additions || 0,
      deletions: prData.deletions || 0,
    };
  },
});

// Step 2: Agent reviews the diff
const reviewDiffStep = createStep({
  id: "review-diff",
  description: "Analyze the PR diff for issues, bugs, and suggestions",
  inputSchema: prDataSchema,
  outputSchema: reviewSchema,
  execute: async ({ inputData }) => {
    const { owner, repo, prNumber, title, body, author, diff, changedFiles, additions, deletions } = inputData;

    // Build a structured review based on diff analysis
    // In production, this step would call the agent with the diff
    const issues: Array<{ severity: "critical" | "warning" | "suggestion" | "praise"; description: string; file?: string }> = [];

    // Basic heuristics (a real review would use the LLM)
    if (additions > 500) {
      issues.push({ severity: "warning", description: `Large PR with ${additions} additions. Consider breaking into smaller PRs.` });
    }
    if (diff.includes("TODO") || diff.includes("FIXME") || diff.includes("HACK")) {
      issues.push({ severity: "suggestion", description: "Contains TODO/FIXME/HACK comments — ensure these are tracked." });
    }
    if (diff.includes("console.log") && !title.toLowerCase().includes("debug")) {
      issues.push({ severity: "suggestion", description: "Contains console.log statements — remove before merging." });
    }
    if (diff.includes("any") && (diff.includes(".ts") || diff.includes("typescript"))) {
      issues.push({ severity: "suggestion", description: "Contains `any` types — consider adding proper type annotations." });
    }
    if (deletions > additions * 2) {
      issues.push({ severity: "praise", description: "Nice cleanup! More deletions than additions." });
    }
    if (changedFiles <= 3 && additions < 100) {
      issues.push({ severity: "praise", description: "Well-scoped PR. Easy to review." });
    }

    const verdict = issues.some((i) => i.severity === "critical")
      ? "request-changes" as const
      : issues.some((i) => i.severity === "warning")
        ? "comment" as const
        : "approve" as const;

    return {
      owner,
      repo,
      prNumber,
      summary: `PR #${prNumber} "${title}" by @${author}: ${changedFiles} files changed (+${additions}/-${deletions})`,
      issues,
      verdict,
    };
  },
});

// Step 3: Post review comment to GitHub
const postReviewStep = createStep({
  id: "post-review",
  description: "Post the review as a comment on the PR",
  inputSchema: reviewSchema,
  outputSchema: postResultSchema,
  execute: async ({ inputData }) => {
    const { owner, repo, prNumber, summary, issues, verdict } = inputData;
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return { posted: false, error: "GITHUB_TOKEN not set" };
    }

    // Build comment body
    const verdictEmoji = verdict === "approve" ? "LGTM" : verdict === "request-changes" ? "Changes requested" : "Review";
    const issueLines = issues.map((i) => {
      const icon = { critical: "!!!", warning: "!", suggestion: "?", praise: "+" }[i.severity];
      return `- [${icon}] ${i.description}${i.file ? ` (${i.file})` : ""}`;
    });

    const commentBody = [
      `## Jarvis Code Review — ${verdictEmoji}`,
      "",
      summary,
      "",
      ...issueLines,
      "",
      `*Automated review by Jarvis*`,
    ].join("\n");

    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "Jarvis/1.0",
        },
        body: JSON.stringify({ body: commentBody }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return { posted: false, error: `GitHub API: ${res.status}` };
      }

      const comment = await res.json() as any;
      return { posted: true, url: comment.html_url };
    } catch (err) {
      return { posted: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
});

// Workflow
export const prReviewWorkflow = createWorkflow({
  id: "pr-review",
  description: "Review a GitHub PR: fetch diff → analyze → post comment",
  inputSchema: prInputSchema,
  outputSchema: postResultSchema,
})
  .then(fetchPRStep)
  .then(reviewDiffStep)
  .then(postReviewStep)
  .commit();
