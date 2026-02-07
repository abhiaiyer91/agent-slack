# Jarvis — The Ultimate AI Assistant

Built on [Mastra](https://mastra.ai), from the team behind Gatsby.

## Project Structure

```
jarvis/
├── src/
│   ├── index.ts                    # Entry point & exports
│   ├── mastra/
│   │   ├── index.ts                # Mastra instance (DI container)
│   │   ├── models.ts               # Model routing (Anthropic > OpenAI > Google)
│   │   ├── agents/
│   │   │   └── jarvis.ts           # Core Jarvis agent
│   │   ├── tools/
│   │   │   ├── index.ts            # Tool barrel exports
│   │   │   ├── web-search.ts       # Web search tool
│   │   │   ├── file-system.ts      # Sandboxed file system tool
│   │   │   └── system-status.ts    # System monitoring tool
│   │   └── workflows/
│   │       ├── daily-briefing.ts   # Parallel workflow: weather + schedule + news
│   │       └── research.ts         # Sequential workflow: decompose → search → synthesize
│   ├── voice/
│   │   └── provider.ts             # Voice provider factory (ElevenLabs / OpenAI / Deepgram)
│   ├── vision/
│   │   └── tool.ts                 # Image analysis tool
│   ├── canvas/
│   │   └── tool.ts                 # Generative UI tool (typed component model)
│   └── integrations/
│       ├── channels.ts             # Channel registry & message types
│       └── security.ts             # Allowlist, rate limiting, prompt injection detection
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Quick Start

```bash
cd jarvis
cp .env.example .env
# Add at least one LLM API key to .env

npm install
npm run dev     # Starts Mastra dev server with playground UI
```

## Why Mastra over OpenClaw

| | OpenClaw | Jarvis (Mastra) |
|---|---|---|
| **Architecture** | Hand-rolled WS gateway, 400+ tangled source files | Clean DI container, plugin-based |
| **Type Safety** | Partial, many `any` types | Strict TypeScript, Zod schemas end-to-end |
| **Voice** | Duct-taped TTS with manual failover | First-class `MastraVoice` abstraction, 13 providers |
| **Generative UI** | Raw HTML injection, file-watch reload | Typed component model, streamed via AI SDK |
| **Vision** | Tangled provider registry with base64 gymnastics | AI SDK native multi-modal content parts |
| **Workflows** | Cron jobs only | Graph-based engine: `.then()`, `.branch()`, `.parallel()` |
| **Memory** | Custom session files | Thread-based with semantic recall + working memory |
| **Security** | 6-digit pairing codes | Allowlist + rate limiting + prompt injection detection |
| **Integrations** | Hardcoded channel modules | MCP + plugin registry |
| **Testing** | Fragile e2e-heavy suite | Vitest with co-located tests |
| **Backing** | Community | YC W25, team behind Gatsby |
