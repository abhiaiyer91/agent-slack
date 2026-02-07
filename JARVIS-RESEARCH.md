# Project Jarvis — OpenClaw Competitive Intelligence Report

**Date:** February 7, 2026
**Subject:** OpenClaw project inspection for Jarvis foundation
**Repository:** [openclaw/openclaw](https://github.com/openclaw/openclaw) (171K+ stars, MIT License)
**Stack:** TypeScript / Node.js (>=22), pnpm monorepo

---

## Executive Summary

OpenClaw is a personal AI assistant platform with 171K+ GitHub stars. It runs a local-first Gateway (WebSocket control plane) and connects to virtually every messaging platform. It has deep capabilities in all four areas we're investigating: integrations, voice, generative UI, and vision. This document breaks down the architecture and key learnings for each.

---

## 1. Integrations

### Architecture

OpenClaw uses a **plugin-based channel registry** (`src/channels/registry.ts`). Channels are registered as plugins with metadata (label, docs path, system image, aliases). There's a core set of 7 "chat channels" plus extension channels, all normalized through a `ChannelId` type system.

### Core Channels (Built-in)

| Channel | Implementation | Protocol |
|---------|---------------|----------|
| **Telegram** | grammY framework | Bot API |
| **WhatsApp** | Baileys library | QR link / Web |
| **Discord** | discord.js | Bot API |
| **Google Chat** | Chat API | HTTP webhook |
| **Slack** | Bolt framework | Socket Mode |
| **Signal** | signal-cli | Linked device |
| **iMessage** | imsg (legacy) | macOS native |

### Extension Channels (Plugin System)

Found in `extensions/`:
- **BlueBubbles** (iMessage, recommended over legacy)
- **Microsoft Teams** (msteams)
- **Matrix** (open protocol)
- **Zalo** + **Zalo Personal**
- **Line**
- **Nostr**
- **Feishu** (Lark/ByteDance)
- **Mattermost**
- **Nextcloud Talk**
- **Twitch**
- **Tlon** (Urbit)

### Integration Infrastructure

- **Multi-agent routing**: Route inbound channels/accounts/peers to isolated agents with per-agent workspaces and sessions
- **DM pairing security**: Unknown senders get a pairing code; must be approved via CLI (`openclaw pairing approve`)
- **Group routing**: Mention gating, reply tags, per-channel chunking
- **Webhook system**: Inbound webhooks for external triggers
- **Gmail Pub/Sub**: Native Gmail integration for email monitoring
- **Cron jobs**: Scheduled tasks and wake-ups
- **Browser control**: Dedicated Chromium instance with CDP, Playwright AI, snapshot/action/upload support, profile management
- **Skills platform**: Bundled, managed, and workspace skills — there are 50+ skills including GitHub, Slack, Discord, Notion, Obsidian, Spotify, Trello, 1Password, Apple Notes/Reminders, weather, and more

### Key Takeaway for Jarvis

OpenClaw's integration layer is *massive*. The plugin architecture (`openclaw.plugin.json` manifest + entry TypeScript file) makes it extensible. The channel registry pattern with aliases and normalization is clean. For Jarvis, we should adopt:
- The plugin manifest pattern for channel registration
- The DM pairing security model (critical for a personal assistant)
- The multi-agent routing concept (different "Jarvis modes" for different contexts)
- The skills platform for third-party tool integration

---

## 2. Voice

### Architecture

Voice in OpenClaw is a multi-layered system spanning TTS, STT, voice wake, talk mode, and telephony.

### Text-to-Speech (TTS) — `src/tts/tts.ts`

Three providers with automatic failover:

| Provider | Default Model | Default Voice | Notes |
|----------|--------------|---------------|-------|
| **Edge TTS** | `node-edge-tts` | `en-US-MichelleNeural` | Free, default provider |
| **OpenAI** | `gpt-4o-mini-tts` | `alloy` | Paid, high quality |
| **ElevenLabs** | `eleven_multilingual_v2` | `pMsXgVXv3BLzUgSXRplE` | Paid, most natural |

Key features:
- **Auto modes**: `off`, `always`, `inbound` (respond with voice when user sends voice), `tagged` (only when LLM uses TTS directives)
- **TTS directives**: The LLM can override voice, model, speed, stability, and text-to-speak via inline directives in responses
- **Summarization**: Long texts are auto-summarized before TTS (configurable, uses the LLM)
- **Telegram voice notes**: Auto-converts to Opus format for native voice note delivery
- **Telephony mode**: PCM output at 22-24kHz for phone calls
- **Provider failover**: If one TTS provider fails, automatically tries the next
- **User preferences**: Stored in `~/.openclaw/settings/tts.json`, can be toggled per-user

### Voice Wake + Talk Mode — Native Apps

- **Voice Wake**: Always-on wake word detection on macOS/iOS/Android
- **Talk Mode**: Overlay UI for real-time conversation on macOS/iOS/Android
- Uses ElevenLabs for highest quality voice interaction
- Wake word detection runs locally on-device

### Voice Calls — `extensions/voice-call/`

Full telephony integration:

| Provider | Protocol |
|----------|----------|
| **Twilio** | Programmable Voice + Media Streams |
| **Telnyx** | Call Control v2 |
| **Plivo** | Voice API + XML + GetInput speech |
| **Mock** | Dev/testing |

Features:
- Initiate outbound calls, continue conversations, speak mid-call
- Webhook signature verification for security
- Media streaming with OpenAI Realtime API
- CLI: `openclaw voicecall call --to "+1555..." --message "Hello"`
- Tool: `voice_call` with actions: `initiate_call`, `continue_call`, `speak_to_user`, `end_call`, `get_status`

### Speech-to-Text (STT) — `src/media-understanding/`

Audio transcription providers:
- **OpenAI Whisper** (API)
- **Deepgram**
- **Google**
- **Groq** (Whisper on Groq hardware)
- **Local Whisper** (via skill: `skills/openai-whisper/`)
- **Sherpa-ONNX TTS** (local, via skill)

### Key Takeaway for Jarvis

OpenClaw's voice stack is production-ready and battle-tested. For Jarvis:
- Adopt the **multi-provider TTS with failover** pattern (Edge for free tier, ElevenLabs for premium)
- The **TTS directive system** (letting the LLM control voice parameters) is brilliant — Jarvis should have this
- The **telephony bridge** via Twilio/Telnyx is a killer feature (imagine Jarvis making phone calls for Tony)
- Wake word detection + Talk Mode overlay is exactly what Jarvis needs for always-on interaction
- The auto-mode system (`inbound` = respond with voice when user speaks) is natural UX

---

## 3. Generative UI (A2UI) — THIS IS BIG

### Architecture

OpenClaw calls this **A2UI** (Agent-to-UI) and **Canvas**. It's a system where the AI agent can dynamically push, render, and interact with visual content on the user's device.

### Canvas Host — `src/canvas-host/`

The Canvas is a **web-based visual workspace** served directly from the Gateway:
- Hosted at `/__openclaw__/canvas` (user content) and `/__openclaw__/a2ui` (framework)
- The agent can push HTML/JS/CSS to the canvas in real-time
- **Live reload** via WebSocket (`/__openclaw__/ws`) — file changes auto-reload the canvas
- File watcher (chokidar) monitors the canvas root directory
- Default canvas root: `~/.openclaw/canvas/`

### A2UI Action Bridge — Cross-Platform

The A2UI system injects a JavaScript bridge into every canvas page:

```javascript
// iOS bridge
window.webkit.messageHandlers.openclawCanvasA2UIAction.postMessage(payload)

// Android bridge  
window.openclawCanvasA2UIAction.postMessage(payload)

// Universal API
globalThis.OpenClaw.sendUserAction({
  name: "action_name",
  surfaceId: "main",
  sourceComponentId: "component.id",
  context: { ... }
})
```

This means:
1. The agent generates UI (HTML/JS/CSS)
2. The UI is pushed to the user's device canvas
3. The user interacts with the UI
4. User actions are sent back to the agent via the bridge
5. The agent can respond to those actions

### Canvas Tools (Agent-Side)

The agent has tools to control the canvas:
- **`canvas.push`** — Push new HTML/content to the canvas
- **`canvas.reset`** — Clear the canvas
- **`canvas.eval`** — Execute JavaScript on the canvas
- **`canvas.snapshot`** — Take a screenshot of the current canvas state

### Platform Support

| Platform | Canvas Support | Notes |
|----------|---------------|-------|
| **macOS** | Full | Menu bar app, dedicated window |
| **iOS** | Full | Native app with Canvas view, Bonjour pairing |
| **Android** | Full | Native app with Canvas view |
| **WebChat** | Via browser | Served from Gateway |

### How It Works (Flow)

```
User asks: "Show me my portfolio performance"
           ↓
Agent generates interactive chart (HTML + Chart.js)
           ↓
canvas.push → Gateway → WebSocket → Device Canvas
           ↓
User sees live, interactive chart on their device
           ↓
User clicks a data point → A2UI bridge → Agent
           ↓
Agent responds: "That spike on Jan 15 was due to..."
```

### Security

- File paths are sandboxed to the canvas root via `openFileWithinRoot`
- Symlinks are rejected
- Path traversal is blocked
- No-store cache headers prevent caching sensitive generated UI

### Key Takeaway for Jarvis

A2UI is the crown jewel. This is how Jarvis should present information to Tony:
- **Agent-generated interactive dashboards** — not just text responses
- **Real-time push updates** — the agent proactively updates the UI
- **Bidirectional interaction** — Tony taps something, Jarvis responds contextually
- **Cross-platform** — same canvas system on phone, tablet, desktop, browser
- The `canvas.eval` capability means Jarvis can run arbitrary visualization logic
- The `canvas.snapshot` means Jarvis can "see" what it's showing (self-awareness of UI state)

For Jarvis, we should extend this with:
- 3D holographic-style visualizations (Three.js on canvas)
- Real-time data feeds (stock tickers, security cameras, building systems)
- Gesture-based interaction on mobile
- Multi-surface support (show different things on different screens simultaneously)

---

## 4. Vision

### Architecture

Vision in OpenClaw is handled by the **Media Understanding** system (`src/media-understanding/`). It processes images, audio, and video attachments through a capability-based pipeline.

### Capabilities

| Capability | Kind | Description |
|-----------|------|-------------|
| **Image** | `image.description` | Describe/analyze images |
| **Audio** | `audio.transcription` | Transcribe audio to text |
| **Video** | `video.description` | Describe/analyze video content |

### Vision Providers — `src/media-understanding/providers/`

| Provider | Capabilities | Default Model |
|---------|-------------|---------------|
| **OpenAI** | Image, Audio | `gpt-5-mini` |
| **Anthropic** | Image | `claude-opus-4-6` |
| **Google** | Image, Audio, Video | `gemini-3-flash-preview` |
| **Groq** | Audio | Whisper |
| **Deepgram** | Audio | — |
| **MiniMax** | Image | `MiniMax-VL-01` |

### Pipeline Architecture

```
Inbound message with attachment
        ↓
normalizeMediaAttachments(ctx)  → Extract attachments from context
        ↓
resolveAttachmentKind()         → Classify: image / audio / video / document
        ↓
buildProviderRegistry()         → Set up available providers
        ↓
For each capability (image → audio → video):
  runCapability()               → Try configured providers with failover
        ↓
formatMediaUnderstandingBody()  → Inject descriptions into message context
        ↓
Result: ctx.Body now contains "[Image: A photo of...]" etc.
```

### Key Features

- **Auto-detection**: Automatically detects which providers have API keys and uses them
- **Provider failover**: `AUTO_IMAGE_KEY_PROVIDERS = ["openai", "anthropic", "google", "minimax"]` — tries each in order
- **Vision model checking**: `modelSupportsVision()` validates the model can handle image input
- **Concurrent processing**: Multiple attachments processed in parallel with configurable concurrency
- **File understanding**: Beyond images — PDFs, CSVs, JSON, YAML, XML, Markdown, code files are all parsed and injected as `<file>` blocks
- **Video handling**: Videos converted to base64 frames for analysis (with byte limits)
- **Scope control**: `resolveMediaUnderstandingScope` allows per-channel, per-capability enable/disable
- **SSRF protection**: Attachment URL fetching has redirect limits, timeout, and allowlist controls
- **Caching**: `MediaAttachmentCache` prevents re-downloading the same attachment for multiple capabilities

### Camera Integration (via Nodes)

On iOS/Android/macOS nodes:
- **`camera.snap`** — Take a photo from device camera
- **`camera.clip`** — Record a short video clip  
- **`screen.record`** — Capture screen recording
- The agent can proactively request visual input

### Document/File Understanding

The system goes beyond pure "vision" — it understands documents:
- PDF extraction with configurable page limits and pixel limits
- UTF-8/UTF-16LE/UTF-16BE detection and decoding
- Legacy CP1252 text decoding
- Content sanitization (XML injection prevention in `<file>` blocks)
- MIME type detection and validation

### Key Takeaway for Jarvis

OpenClaw's vision system is comprehensive and production-hardened. For Jarvis:
- The **multi-provider failover** is essential — never be blind
- **Camera snap/clip** integration means Jarvis can literally "look" at what Tony is looking at
- **Screen recording** means Jarvis can observe Tony's screen and offer contextual help
- **Document understanding** (PDF, code, data files) is critical for an executive assistant
- **Video analysis** via Google Gemini is a differentiator — analyze security footage, product demos, etc.
- The **concurrent processing pipeline** is well-designed for real-time use

For Jarvis, we should extend with:
- Real-time video stream analysis (security cameras, drone feeds)
- Object detection and tracking (not just description)
- OCR for whiteboard/document scanning
- Face recognition (authorized personnel detection)
- Multi-camera dashboard with simultaneous feeds

---

## Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │          OpenClaw Gateway            │
                    │      (WebSocket Control Plane)       │
                    │       ws://127.0.0.1:18789           │
                    └──────────────┬──────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
    ┌─────┴─────┐           ┌─────┴─────┐           ┌─────┴─────┐
    │  Channels  │           │   Agent    │           │   Tools    │
    │            │           │  (Pi RPC)  │           │            │
    │ Telegram   │           │            │           │ Browser    │
    │ WhatsApp   │           │ Claude     │           │ Canvas     │
    │ Discord    │           │ GPT        │           │ Camera     │
    │ Slack      │           │ Gemini     │           │ Cron       │
    │ Signal     │           │ + failover │           │ Skills     │
    │ iMessage   │           │            │           │ Voice Call │
    │ Teams      │           └────────────┘           │ Location   │
    │ Matrix     │                                    │ Bash/Shell │
    │ + more     │                                    └────────────┘
    └────────────┘
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js >= 22 |
| Language | TypeScript (strict) |
| Package Manager | pnpm (monorepo) |
| Build | tsdown (tsup successor) |
| Test | Vitest (unit, e2e, integration, live) |
| Lint | oxlint + markdownlint |
| Format | oxfmt |
| macOS App | Swift (SwiftUI) |
| iOS App | Swift (native) |
| Android App | Native |
| UI | Vite + vanilla TS |
| WebSocket | ws library |
| AI SDK | @mariozechner/pi-ai (custom) |
| Browser | Playwright + CDP |
| File Watch | chokidar |

## Recommendations for Jarvis

### What to Adopt Directly
1. **Gateway architecture** — WebSocket control plane is the right pattern
2. **Plugin system** — Channel plugins with manifest files
3. **TTS failover chain** — Edge (free) → OpenAI → ElevenLabs
4. **A2UI canvas** — Agent-generated interactive UI, bidirectional
5. **Media understanding pipeline** — Multi-provider vision with caching
6. **DM pairing security** — Essential for a personal assistant
7. **Skills platform** — Extensible tool ecosystem

### What to Improve Upon
1. **Real-time streaming** — OpenClaw's canvas uses page reload; Jarvis should use incremental DOM updates
2. **3D visualization** — Canvas should support Three.js/WebGL for holographic-style displays
3. **Proactive intelligence** — Go beyond cron; use event-driven triggers with ML-based relevance scoring
4. **Multi-device orchestration** — Show different content on different screens simultaneously
5. **Continuous vision** — Move from snapshot-based to stream-based video analysis
6. **Emotional intelligence** — Add sentiment analysis to voice input for tone-aware responses

### Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Gateway + Channels | High | High | P0 |
| A2UI Canvas | Very High | Medium | P0 |
| Voice (TTS + STT) | High | Medium | P0 |
| Vision Pipeline | High | Medium | P1 |
| Skills Platform | Medium | Medium | P1 |
| Voice Calls | Medium | High | P2 |
| Browser Control | Medium | Medium | P2 |

---

*"Sometimes you gotta run before you can walk." — Tony Stark*
