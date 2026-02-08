/**
 * Email tool — send emails via Resend API or SMTP.
 *
 * Gives Jarvis the ability to send email notifications, reports, and
 * summaries. Uses Resend (modern email API, free tier: 100 emails/day)
 * as the default, with SMTP as a fallback.
 *
 * Setup: Set RESEND_API_KEY in .env (get one at https://resend.com)
 * Or set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS for SMTP.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const emailTool = createTool({
  id: "email",
  description: `Send an email. Use this when the user asks you to email someone, send a report, or notify someone via email. Requires RESEND_API_KEY or SMTP configuration in .env.`,

  inputSchema: z.object({
    to: z.string().describe("Recipient email address"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body (plain text or HTML)"),
    isHtml: z.boolean().default(false).describe("Whether the body is HTML"),
  }),

  outputSchema: z.object({
    sent: z.boolean(),
    messageId: z.string().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ to, subject, body, isHtml }) => {
    // Try Resend first
    if (process.env.RESEND_API_KEY) {
      return sendViaResend({ to, subject, body, isHtml: isHtml ?? false });
    }

    // Fall back to SMTP
    if (process.env.SMTP_HOST) {
      return sendViaSMTP({ to, subject, body, isHtml: isHtml ?? false });
    }

    return {
      sent: false,
      error: "No email provider configured. Set RESEND_API_KEY (free at resend.com) or SMTP_HOST/SMTP_USER/SMTP_PASS in .env.",
    };
  },
});

async function sendViaResend(params: {
  to: string;
  subject: string;
  body: string;
  isHtml: boolean;
}): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  try {
    const from = process.env.RESEND_FROM || "Jarvis <jarvis@resend.dev>";

    const payload: Record<string, any> = {
      from,
      to: [params.to],
      subject: params.subject,
    };

    if (params.isHtml) {
      payload.html = params.body;
    } else {
      payload.text = params.body;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any;
      return { sent: false, error: `Resend API: ${res.status} ${err.message || res.statusText}` };
    }

    const data = await res.json() as any;
    return { sent: true, messageId: data.id };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function sendViaSMTP(params: {
  to: string;
  subject: string;
  body: string;
  isHtml: boolean;
}): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  try {
    // Use nodemailer if available (it's a common dep, but we don't want to force it)
    // Use dynamic require to avoid TypeScript module resolution
    const nodemailerModule = await new Function('return import("nodemailer")')().catch(() => null) as any;
    if (!nodemailerModule) {
      return { sent: false, error: "SMTP requires nodemailer. Run: npm install nodemailer" };
    }

    const transport = nodemailerModule.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "jarvis@localhost";

    const info = await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      ...(params.isHtml ? { html: params.body } : { text: params.body }),
    });

    return { sent: true, messageId: info.messageId };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}
