# Jarvis vs OpenClaw — Honest Gap Analysis

## Where We're Ahead

| Area | Jarvis | OpenClaw | Verdict |
|------|--------|----------|---------|
| Type safety | Strict TS, Zod end-to-end | Lots of `any`, partial types | **Jarvis** |
| Architecture | Mastra DI, clean separation | 400+ tangled files, hand-rolled everything | **Jarvis** |
| Generative UI model | Typed components, no HTML injection | Raw HTML files + chokidar file watcher | **Jarvis** |
| Framework backing | Mastra (YC W25, Gatsby team) | Community-maintained | **Jarvis** |
| Tool type contracts | Zod schemas on every input/output | Mixed, many untyped | **Jarvis** |
| Workflow engine | Graph-based with .then/.parallel/.branch | Cron jobs only | **Jarvis** |
| Security design | Allowlist + rate limit + injection detect | 6-digit pairing codes | **Jarvis** |

## Where OpenClaw is Ahead (the real gaps)

| Area | OpenClaw | Jarvis | Gap Size |
|------|----------|--------|----------|
| Channels that actually work | 18 real integrations (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Teams, Matrix...) all sending/receiving live messages | 1 Slack skeleton that's all comments | **Massive** |
| Memory / conversation persistence | Thread-based sessions, message storage, cross-session recall | Memory package imported but never wired into the agent | **Critical** |
| Voice end-to-end | Wake word on macOS/iOS/Android, Talk Mode overlay, telephony calls via Twilio | Provider factory exists, never connected to server or agent | **Large** |
| MCP tools connected | N/A (they don't use MCP) | getMCPTools() exported but never called — agent has zero MCP tools | **Self-inflicted** |
| Conversation history | Full session management with pruning | Chat endpoint sends only the last message, no history | **Critical** |
| Workflow data sources | Cron + Gmail Pub/Sub + webhooks + real data | All workflow steps return hardcoded placeholder strings | **Large** |
| Native apps | macOS menu bar, iOS app, Android app | Browser only | **Large** |
| Browser automation | Playwright + CDP, full page control | None | **Medium** |
| Battle-testing | 171K stars, thousands of daily users | 11 unit tests, 0 real users | **Massive** |

## The Five Things That Actually Matter Right Now

1. **Memory is not wired in.** The agent can't remember anything between messages. We import `@mastra/memory` but removed it from the agent due to a version bug we already fixed. It just needs to be added back.

2. **MCP tools are dead code.** `getMCPTools()` exists but is never called. The agent has 5 tools. With MCP it could have 50+. It just needs to be called at startup and spread into the agent config.

3. **Chat is stateless.** The server sends only the last user message to the agent. No conversation history. Jarvis literally forgets you exist after each message. The fix is to thread messages through Mastra's memory.

4. **Workflow steps are fake.** Every step in daily-briefing and research returns a hardcoded string. The research workflow should use the web search tool. The weather step should call a weather API.

5. **Voice is disconnected.** The provider factory creates voice objects but they're never attached to anything. No `/api/voice` endpoint. No audio in the UI.

## What We Don't Need to Match

- 18 channel integrations (we need 1 that works, not 18 skeletons)
- Native apps (the web UI is the right starting point)
- Browser automation (nice-to-have, not core)
- 171K stars (irrelevant to quality)
