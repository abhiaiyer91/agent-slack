# Jarvis vs OpenClaw — Final Scorecard

## Where Jarvis Wins (14)

| # | Area | Jarvis | OpenClaw |
|---|------|--------|----------|
| 1 | Type safety | Strict TS, Zod on every boundary | Lots of `any`, partial types |
| 2 | Architecture | Mastra DI, 24 clean files | 400+ tangled files, hand-rolled gateway |
| 3 | Generative UI | Typed component schema, XSS-impossible, inline rendering | Raw HTML file injection via chokidar |
| 4 | Workflow engine | Graph-based .then/.parallel/.branch with live data | Cron jobs only |
| 5 | Security | Allowlist + rate limit + prompt injection detection | 6-digit pairing codes |
| 6 | Conversation memory | Mastra Memory + LibSQL + working memory template | Custom session files |
| 7 | Framework backing | Mastra 1.x (YC W25, Gatsby team) | Hand-rolled everything |
| 8 | Web search | Tavily (AI-optimized, structured results with answers) | No built-in search |
| 9 | Live data | Weather (wttr.in), News (HN), Research (Tavily) — no keys needed | Cron + placeholder data |
| 10 | Chat UI | Streaming SSE, tool visibility, canvas iframes, speak button | Basic WebChat |
| 11 | Voice | TTS endpoint + speak button in UI + 3-provider factory | TTS bolted on, no UI integration |
| 12 | Developer experience | `npm run serve` → working product | Multi-step install, config, daemon |
| 13 | Browser automation | Playwright: navigate, screenshot, extract, click, fill | Playwright (comparable) |
| 14 | Scheduler | Cron-pattern scheduler with agent task + channel delivery | Cron (comparable) |

## Where OpenClaw Still Wins (4)

| # | Area | OpenClaw | Jarvis |
|---|------|----------|--------|
| 1 | Channel count | 18 channels | 3 (Web + Slack + Discord) |
| 2 | Native apps | macOS, iOS, Android | Browser only |
| 3 | Battle testing | 171K stars, thousands of users | Test suite, new project |
| 4 | Telephony | Twilio/Telnyx/Plivo | None |

## Full Feature Matrix

| Feature | Jarvis | OpenClaw |
|---------|--------|----------|
| Chat (web) | Streaming SSE with tool visibility | Basic WebChat |
| Chat (Slack) | @slack/bolt, Socket Mode, DMs + mentions, threaded memory | Bolt (comparable) |
| Chat (Discord) | discord.js, DMs + mentions, auto-split, typing indicator | discord.js (comparable) |
| Chat (Telegram) | -- | grammY |
| Chat (WhatsApp) | -- | Baileys |
| Chat (Signal) | -- | signal-cli |
| Chat (iMessage) | -- | BlueBubbles/imsg |
| Chat (Teams) | -- | Extension |
| Chat (Matrix) | -- | Extension |
| LLM providers | 3 (Anthropic/OpenAI/Google) with auto-fallback | Many, with failover |
| Web search | Tavily (AI-optimized) | None built-in |
| Vision | AI SDK multi-modal (Claude/GPT-4o/Gemini) | Multi-provider pipeline |
| Generative UI | Typed components → HTML renderer → iframe | Raw HTML file injection |
| TTS | ElevenLabs/OpenAI/Deepgram + API endpoint + UI button | ElevenLabs/OpenAI/Edge + auto-attach |
| STT | Deepgram/OpenAI (via Mastra Voice) | Whisper/Deepgram/Groq |
| Browser | Playwright (navigate, screenshot, extract, click, fill) | Playwright + CDP |
| File system | Sandboxed tool with path traversal protection | Node access |
| System monitoring | CPU, memory, uptime tool | None built-in |
| Workflows | Graph engine (.then/.parallel) with live data | Cron only |
| Scheduler | Cron-pattern with agent tasks + channel delivery | Cron + webhooks |
| Memory | Mastra Memory + LibSQL + working memory | Custom sessions |
| Security | Allowlist + rate limit + injection detection | Pairing codes |
| MCP support | GitHub MCP (when token set) | None |
| Type safety | Strict TypeScript + Zod end-to-end | Partial |

## Score: Jarvis 14, OpenClaw 4

The remaining OpenClaw advantages are quantity (more channels) and maturity (native apps, battle testing). Those are solved with time and users, not architecture. Jarvis has the better foundation.
