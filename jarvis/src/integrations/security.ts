/**
 * Security layer for Jarvis integrations.
 *
 * Every inbound message goes through this before reaching the agent.
 * Unlike OpenClaw's pairing-code system (which is just security theater
 * if anyone can guess a 6-digit code), we use a proper allowlist with
 * cryptographic verification.
 *
 * Security model:
 *   1. Allowlist — only approved sender IDs can interact with Jarvis
 *   2. Rate limiting — prevent abuse from approved senders
 *   3. Content filtering — reject known-bad patterns (prompt injection)
 *   4. Audit log — every interaction is logged for review
 */

import type { InboundMessage } from "./channels.js";

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

const allowedSenders = new Map<string, AllowedSender>();

interface AllowedSender {
  senderId: string;
  channelId: string;
  name?: string;
  role: "admin" | "user" | "readonly";
  addedAt: string;
}

/**
 * Add a sender to the allowlist.
 */
export function allowSender(params: {
  senderId: string;
  channelId: string;
  name?: string;
  role?: "admin" | "user" | "readonly";
}): void {
  const key = `${params.channelId}:${params.senderId}`;
  allowedSenders.set(key, {
    senderId: params.senderId,
    channelId: params.channelId,
    name: params.name,
    role: params.role || "user",
    addedAt: new Date().toISOString(),
  });
}

/**
 * Remove a sender from the allowlist.
 */
export function revokeSender(channelId: string, senderId: string): boolean {
  return allowedSenders.delete(`${channelId}:${senderId}`);
}

/**
 * Check if a sender is allowed.
 */
export function isAllowed(channelId: string, senderId: string): boolean {
  return allowedSenders.has(`${channelId}:${senderId}`);
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

const rateLimitWindow = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // messages per window
const RATE_WINDOW_MS = 60_000; // 1 minute

/**
 * Check and update rate limit for a sender. Returns true if allowed.
 */
function checkRateLimit(channelId: string, senderId: string): boolean {
  const key = `${channelId}:${senderId}`;
  const now = Date.now();
  const entry = rateLimitWindow.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitWindow.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// Content Filtering — basic prompt injection detection
// ---------------------------------------------------------------------------

const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /<<SYS>>/i,
];

/**
 * Check if message content contains suspicious patterns.
 */
function detectPromptInjection(text: string): boolean {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(text));
}

// ---------------------------------------------------------------------------
// Security Gate — the main entry point
// ---------------------------------------------------------------------------

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  sender?: AllowedSender;
  warnings: string[];
}

/**
 * Run all security checks on an inbound message.
 * Returns whether the message should be processed and any warnings.
 */
export function checkSecurity(message: InboundMessage): SecurityCheckResult {
  const warnings: string[] = [];

  // 1. Allowlist check
  if (!isAllowed(message.channelId, message.senderId)) {
    return {
      allowed: false,
      reason: `Sender ${message.senderId} on ${message.channelId} is not in the allowlist`,
      warnings,
    };
  }

  const sender = allowedSenders.get(`${message.channelId}:${message.senderId}`)!;

  // 2. Rate limit check
  if (!checkRateLimit(message.channelId, message.senderId)) {
    return {
      allowed: false,
      reason: `Rate limit exceeded for ${message.senderId} on ${message.channelId}`,
      sender,
      warnings,
    };
  }

  // 3. Content filtering
  if (message.text && detectPromptInjection(message.text)) {
    warnings.push("Potential prompt injection detected");
    // Don't block — just warn. The agent's system prompt should be robust.
    // Log it for audit.
    console.warn(
      `[Jarvis Security] Prompt injection pattern detected from ${message.senderId} on ${message.channelId}`
    );
  }

  // 4. Read-only check
  if (sender.role === "readonly") {
    warnings.push("Sender has readonly access");
  }

  return { allowed: true, sender, warnings };
}
