# Jarvis — The Ultimate AI Assistant

Built on [Mastra](https://mastra.ai), from the team behind Gatsby.

## Get Started in 60 Seconds

```bash
cd jarvis
npm install
cp .env.example .env
```

Open `.env` and add **one** LLM key (pick any):

```
OPENAI_API_KEY=sk-...
# or ANTHROPIC_API_KEY=sk-ant-...
# or GOOGLE_GENERATIVE_AI_API_KEY=AI...
```

Start Jarvis:

```bash
npm run serve
```

Open **http://localhost:3033** in your browser. That's it. You're talking to Jarvis.

## Three Ways to Use It

### 1. Chat UI (quickest)

```bash
npm run serve
# → http://localhost:3033
```

A dark-themed chat interface with streaming responses, tool call visibility, speak button for TTS, and canvas rendering inline. Click the example prompts to try:

- **"Check system status"** — Jarvis reads your CPU, memory, uptime
- **"Search the web for Mastra AI framework"** — live Tavily search (needs `TAVILY_API_KEY`)
- **"Show me a dashboard of system metrics"** — generative UI rendered as an interactive canvas
- **"Write a note reminding me to review the project"** — writes a file to the workspace
- **"Visit https://news.ycombinator.com and tell me the top stories"** — Playwright browser automation

Jarvis remembers your conversation. Ask follow-up questions — it has context.

### 2. Slack / Discord Bot (always-on)

**Slack** — add to `.env`:
```
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
```

**Discord** — add to `.env`:
```
DISCORD_BOT_TOKEN=...
```

Then `npm run serve`. The bots start automatically alongside the web UI. DM the bot or @mention it in a channel. Each thread gets its own conversation memory.

### 3. API (programmatic)

```bash
# Health check
curl http://localhost:3033/api/health

# Chat (streaming SSE)
curl -X POST http://localhost:3033/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is 2+2?"}],"threadId":"my-thread"}'

# Text-to-speech (returns audio/mpeg)
curl -X POST http://localhost:3033/api/voice/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"Good evening, sir."}' \
  --output jarvis.mp3

# View a rendered canvas
curl http://localhost:3033/api/canvas/CANVAS_ID
```

## Run the Tests (no API key needed)

```bash
npm test
```

Runs 11 tests that verify every subsystem:

```
=== JARVIS TEST HARNESS ===

[1] Mastra Instance
  PASS  Mastra instance is created
  PASS  Jarvis agent is registered
  PASS  Workflows are registered

[2] Security Layer
  PASS  Unknown sender is blocked
  PASS  Allowed sender passes
  PASS  Prompt injection is flagged
  PASS  Rate limiting works

[3] Canvas Renderer
  PASS  Renders a dashboard with all component types

[4] Voice Capabilities
  PASS  Voice capabilities detection works

[5] System Status Tool
  PASS  System status tool returns host info

[6] File System Tool
  PASS  File system write + read roundtrip
```

3 more tests unlock when you add API keys (LLM chat, tool use, web search).

## Optional API Keys

| Key | What it enables | Free tier? |
|-----|----------------|------------|
| `OPENAI_API_KEY` | Chat, vision, voice (TTS + STT) | Pay-as-you-go |
| `ANTHROPIC_API_KEY` | Chat, vision (Claude) | Pay-as-you-go |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Chat, vision (Gemini) | Free tier available |
| `TAVILY_API_KEY` | Live web search | Free at [tavily.com](https://tavily.com) |
| `ELEVENLABS_API_KEY` | Premium voice synthesis | Free tier available |
| `DEEPGRAM_API_KEY` | Fast speech-to-text | Free tier available |
| `GITHUB_TOKEN` | GitHub MCP (repos, PRs, issues) | Free |
| `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` | Slack bot | Free |
| `DISCORD_BOT_TOKEN` | Discord bot | Free |

Only **one LLM key** is required. Everything else is optional and enables additional features.

## What Jarvis Can Do

| Capability | Tool | How it works |
|-----------|------|-------------|
| **Chat** | -- | Streaming responses with conversation memory |
| **Web search** | `webSearchTool` | Tavily AI-optimized search |
| **Vision** | `visionTool` | AI SDK multi-modal (Claude/GPT-4o/Gemini) |
| **Generative UI** | `canvasTool` | Typed components → HTML renderer → inline iframe |
| **Browser** | `browserTool` | Playwright: navigate, screenshot, extract, click, fill |
| **Files** | `fileSystemTool` | Sandboxed read/write/list with path traversal protection |
| **System** | `systemStatusTool` | CPU, memory, uptime, hostname |
| **Voice** | `/api/voice/speak` | ElevenLabs / OpenAI TTS / Deepgram STT |
| **Research** | `researchWorkflow` | Decompose → search each angle → synthesize report |
| **Briefing** | `dailyBriefingWorkflow` | Live weather (wttr.in) + news (HN) in parallel |
| **Scheduling** | `Scheduler` | Cron-pattern tasks with channel delivery |

## Project Structure

```
jarvis/
├── src/
│   ├── server.ts                      # Hono HTTP server (chat, voice, canvas, health)
│   ├── ui.ts                          # Self-contained chat UI (no build step)
│   ├── scheduler.ts                   # Cron-pattern task scheduler
│   ├── test.ts                        # 11-test harness
│   ├── index.ts                       # Barrel exports
│   ├── mastra/
│   │   ├── index.ts                   # Mastra DI container
│   │   ├── models.ts                  # Model routing (Anthropic > OpenAI > Google)
│   │   ├── agents/jarvis.ts           # Agent: 7 tools, 2 workflows, memory
│   │   ├── tools/
│   │   │   ├── web-search.ts          # Tavily search
│   │   │   ├── browser.ts            # Playwright automation
│   │   │   ├── file-system.ts         # Sandboxed file ops
│   │   │   ├── system-status.ts       # OS monitoring
│   │   │   └── mcp.ts                # GitHub MCP
│   │   └── workflows/
│   │       ├── daily-briefing.ts      # Weather + news + schedule (parallel)
│   │       └── research.ts            # Decompose → search → synthesize
│   ├── vision/tool.ts                 # AI SDK multi-modal image analysis
│   ├── canvas/
│   │   ├── tool.ts                    # Typed component model (8 types)
│   │   └── renderer.ts               # Server-side HTML renderer (dark theme, SVG charts)
│   ├── voice/provider.ts              # ElevenLabs / OpenAI / Deepgram factory
│   └── integrations/
│       ├── channels.ts                # Channel interface + registry
│       ├── security.ts                # Allowlist + rate limit + injection detect
│       ├── slack.ts                   # @slack/bolt Socket Mode
│       └── discord.ts                 # discord.js DMs + mentions
└── package.json
```
