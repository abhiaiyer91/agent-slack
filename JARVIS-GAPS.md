# Jarvis vs OpenClaw — Current Scorecard

*Updated after closing critical gaps*

## Where Jarvis Wins

| Area | Jarvis | OpenClaw | Why It Matters |
|------|--------|----------|----------------|
| Type safety | Strict TS, Zod on every boundary | Lots of `any`, partial types | Fewer runtime bugs, better refactoring |
| Architecture | Mastra DI container, 20 clean files | 400+ tangled files, hand-rolled gateway | 10x easier to add features |
| Generative UI | Typed component schema, XSS-impossible | Raw HTML file injection via chokidar | Security + reliability |
| Workflow engine | Graph-based .then/.parallel/.branch | Cron jobs only | Can express complex multi-step logic |
| Security | Allowlist + rate limit + injection detect | 6-digit pairing codes | Actually secure |
| Conversation memory | Mastra Memory with LibSQL, working memory template | Custom session files | Cleaner abstraction |
| Framework | Mastra 1.x (YC W25, Gatsby team, 20K stars) | Hand-rolled everything | Not maintaining our own framework |
| Web search | Tavily (AI-optimized, structured results) | No built-in search | Better search quality |
| Live data workflows | Weather (wttr.in), News (HN API), Research (Tavily) | Cron + placeholder data | Real data, no API keys needed |
| Chat UI | Streaming SSE, tool visibility, canvas iframes, voice | Basic WebChat | Better user experience |
| Voice integration | TTS endpoint, speak button in UI, ElevenLabs/OpenAI/Deepgram | TTS bolted on, no UI integration | Voice is a first-class feature |
| Developer experience | `npm run serve` → working product | Multi-step install, config files, daemon | Faster to get started |

## Where OpenClaw Still Wins

| Area | OpenClaw | Jarvis | Notes |
|------|----------|--------|-------|
| Channel count | 18 working channels | 1 (Slack, real @slack/bolt) | We have quality over quantity |
| Native apps | macOS, iOS, Android | Browser only | Not a priority yet |
| Browser automation | Playwright + CDP | None | Nice-to-have |
| Voice wake word | Always-on on macOS/iOS/Android | API endpoint only | Needs native app |
| Battle testing | 171K stars, thousands of users | Test suite + manual testing | Ship it and iterate |
| Telephony | Twilio/Telnyx/Plivo calls | None | Future feature |

## What Changed

| Gap | Before | After |
|-----|--------|-------|
| Memory | Not wired in | LibSQL-backed with working memory |
| Chat history | Stateless | Threaded with per-session persistence |
| Slack | Commented-out skeleton | Real @slack/bolt with Socket Mode, DMs, @mentions |
| Voice | Disconnected factory | /api/voice/speak endpoint + speak button in UI |
| Weather data | Hardcoded string | Live from wttr.in (free, no key) |
| News data | Hardcoded string | Live from Hacker News API (free, no key) |
| Research | Hardcoded string | Live Tavily search per sub-question |
| Canvas | Tool only | Tool + renderer + /api/canvas/:id endpoint + iframe in UI |
| Server | Comment block | Hono with SSE streaming, memory, voice, canvas, Slack |

## The Verdict

Jarvis is better than OpenClaw in **architecture, security, type safety, developer experience, generative UI, workflow engine, and voice integration**. OpenClaw still has more channels and native apps, but those are width — not depth. Jarvis is a better foundation to build on.
