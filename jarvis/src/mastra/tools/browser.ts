/**
 * Browser automation tool — Playwright-powered web interaction.
 *
 * Gives Jarvis the ability to:
 *   - Navigate to any URL
 *   - Take screenshots (returned as base64)
 *   - Extract text content from pages
 *   - Click elements, fill forms
 *   - Wait for selectors
 *
 * This closes the browser automation gap with OpenClaw.
 * Uses a headless Chromium instance managed by Playwright.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const browserTool = createTool({
  id: "browser",
  description: `Control a web browser to navigate pages, take screenshots, and extract content. Use this when:
- The user asks you to visit a URL or check a website
- You need to scrape content from a web page
- You need a screenshot of a page
- You need to interact with a web form

Actions: navigate (go to URL + get content), screenshot (capture page as image), extract (get text from selector), click (click an element), fill (fill a form field).`,

  inputSchema: z.object({
    action: z
      .enum(["navigate", "screenshot", "extract", "click", "fill"])
      .describe("Browser action to perform"),
    url: z
      .string()
      .optional()
      .describe("URL to navigate to (required for 'navigate' and 'screenshot')"),
    selector: z
      .string()
      .optional()
      .describe("CSS selector for 'extract', 'click', or 'fill' actions"),
    value: z
      .string()
      .optional()
      .describe("Value to fill (for 'fill' action)"),
    waitFor: z
      .string()
      .optional()
      .describe("CSS selector to wait for before performing action"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    url: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    screenshot: z.string().optional().describe("Base64-encoded PNG screenshot"),
    error: z.string().optional(),
  }),

  execute: async ({ action, url, selector, value, waitFor }) => {
    try {
      // Dynamic import so Playwright is only loaded when the tool is used
      const { chromium } = await import("playwright");

      const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const context = await browser.newContext({
        userAgent: "Jarvis/1.0 (AI Assistant Browser)",
        viewport: { width: 1280, height: 800 },
      });

      const page = await context.newPage();

      try {
        // Navigate if URL provided
        if (url && (action === "navigate" || action === "screenshot" || !selector)) {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        }

        // Wait for selector if specified
        if (waitFor) {
          await page.waitForSelector(waitFor, { timeout: 10000 });
        }

        switch (action) {
          case "navigate": {
            const title = await page.title();
            // Extract main text content, stripped of scripts/styles
            const content = await page.evaluate(`
              (() => {
                const body = document.body.cloneNode(true);
                body.querySelectorAll("script, style, noscript, iframe, svg").forEach(el => el.remove());
                return (body.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 3000);
              })()
            `) as string;

            return {
              success: true,
              url: page.url(),
              title,
              content,
            };
          }

          case "screenshot": {
            const buffer = await page.screenshot({ type: "png", fullPage: false });
            const base64 = buffer.toString("base64");
            const title = await page.title();

            return {
              success: true,
              url: page.url(),
              title,
              screenshot: base64,
            };
          }

          case "extract": {
            if (!selector) {
              return { success: false, error: "Selector required for extract action" };
            }
            const element = await page.$(selector);
            if (!element) {
              return { success: false, error: `Element not found: ${selector}` };
            }
            const text = await element.textContent();
            return {
              success: true,
              url: page.url(),
              content: (text || "").trim().slice(0, 3000),
            };
          }

          case "click": {
            if (!selector) {
              return { success: false, error: "Selector required for click action" };
            }
            await page.click(selector, { timeout: 5000 });
            await page.waitForLoadState("domcontentloaded").catch(() => {});
            return {
              success: true,
              url: page.url(),
              title: await page.title(),
            };
          }

          case "fill": {
            if (!selector || value === undefined) {
              return { success: false, error: "Selector and value required for fill action" };
            }
            await page.fill(selector, value, { timeout: 5000 });
            return {
              success: true,
              url: page.url(),
            };
          }

          default:
            return { success: false, error: `Unknown action: ${action}` };
        }
      } finally {
        await browser.close();
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      // Check for common Playwright issues
      if (error.includes("Executable doesn't exist") || error.includes("browserType.launch")) {
        return {
          success: false,
          error: "Browser not installed. Run: npx playwright install chromium",
        };
      }
      return { success: false, error };
    }
  },
});
