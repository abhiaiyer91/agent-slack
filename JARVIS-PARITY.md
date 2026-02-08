# What People Actually Use OpenClaw For (and What Jarvis Needs)

## The 8 Real Use Cases

Based on the showcase, 3,000+ community skills, ecosystem repos, and automation docs, here's what people actually do with OpenClaw every day:

### 1. Daily Driver Messaging Assistant
**What:** Chat with an AI through WhatsApp/Telegram/Discord all day. Ask questions, get reminders, have it look things up. It's always on, always available.
**OpenClaw:** 18 channels, always-on daemon, DM pairing for security.
**Jarvis status:** Web UI + Slack + Discord. **Gap: needs to be always-on as a daemon, not just `npm run serve`.**

### 2. Email Triage & Response
**What:** Gmail Pub/Sub integration. New email arrives → agent reads it → classifies priority → drafts a response → delivers summary to your chat. Fully automatic.
**OpenClaw:** Gmail Pub/Sub with webhook pipeline, template-based message routing, model selection per hook.
**Jarvis status:** No email integration. **Gap: need webhook endpoint + Gmail/email integration.**

### 3. Scheduled Briefings & Proactive Intelligence
**What:** "Every morning at 7am, summarize my emails, check my calendar, give me weather and news." Cron-based, delivers to your preferred channel.
**OpenClaw:** Cron system with persistent jobs, isolated agent sessions, channel delivery routing.
**Jarvis status:** Scheduler exists but delivery to channels isn't wired. **Gap: wire scheduler output to Slack/Discord delivery.**

### 4. Smart Home Control
**What:** "Turn off the lights" / "Set the thermostat to 72" via chat. Skills for Hue, HomeKit, Midea AC, Bambu printers.
**OpenClaw:** Skills like `openhue`, `midea-ac`, `bambu-cli`.
**Jarvis status:** No smart home tools. **Not a priority — niche use case.**

### 5. Code Review & GitHub Automation
**What:** OpenClaw reviews PRs, summarizes commit history, manages issues. The `coding-agent` skill runs Claude Code/Codex from within OpenClaw.
**OpenClaw:** GitHub skill, coding-agent skill, PR review → chat delivery.
**Jarvis status:** GitHub MCP (when token set), no PR review workflow. **Gap: need a GitHub PR review workflow.**

### 6. Shopping & Browser Automation
**What:** "Order my weekly groceries from Tesco." Agent controls a browser, navigates the site, adds items to cart, checks out. No API needed.
**OpenClaw:** Browser skill + automation.
**Jarvis status:** Browser tool exists (Playwright). **Parity achieved for the primitive. Gap: need higher-level automation workflows.**

### 7. Notes, Tasks & Personal Knowledge
**What:** "Remember that I need to call the dentist." "Add milk to my shopping list." Apple Notes, Obsidian, Notion, Bear, Things integration.
**OpenClaw:** Skills for 10+ note/task apps.
**Jarvis status:** File system tool (read/write workspace files). **Functional but basic — could add Notion MCP.**

### 8. Webhook-Driven Automation
**What:** External event (GitHub push, Stripe payment, monitoring alert) hits a webhook → agent processes it → delivers response to a channel. The glue between services.
**OpenClaw:** `/hooks/wake` and `/hooks/agent` endpoints with auth, template-based routing, delivery to any channel.
**Jarvis status:** No webhook endpoint. **Gap: this is the highest-leverage missing feature.**

---

## Parity Priority Matrix

| Priority | Feature | Impact | Effort | Why |
|----------|---------|--------|--------|-----|
| **P0** | Webhook endpoint (`/api/webhook`) | Very High | Low | Makes Jarvis the glue between any external service and the agent. GitHub, Stripe, monitoring, CI/CD — anything that can POST. |
| **P0** | Scheduler → channel delivery | High | Low | Scheduler exists but results go nowhere. Wire it to send responses to Slack/Discord. |
| **P1** | Process manager / daemon mode | High | Medium | OpenClaw runs as a background daemon. Jarvis dies when you close the terminal. Need a way to keep it running. |
| **P1** | Conversation history API | Medium | Low | UI has threads but there's no API to list past threads or resume them. |
| **P2** | Email integration (Gmail) | Medium | Medium | Second most requested automation after messaging. |
| **P2** | GitHub PR review workflow | Medium | Medium | Common dev use case. |
| **P3** | More channels (Telegram) | Medium | Low | Same pattern as Slack/Discord. |
| **P3** | Notion/Obsidian MCP | Low | Low | Nice-to-have for PKM users. |

---

## What We Do NOT Need

- 18 channel integrations (3 covers 90% of users)
- Smart home skills (niche, not core)
- ClawHub skill registry (premature — need users first)
- Native apps (browser + Slack/Discord covers the use cases)
- Telephony (cool demo, rarely used in practice)
