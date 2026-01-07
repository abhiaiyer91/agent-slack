# 🚀 Daytona Terminal

**The best AI terminal ever.** Better than Warp. Built on [Daytona.io](https://daytona.io).

<p align="center">
  <img src="docs/screenshot.png" alt="Daytona Terminal" width="800">
</p>

## ✨ Features

### 🧠 AI-First Design
- **Auto Error Detection** - Instantly detects errors and suggests fixes
- **Predictive Commands** - AI suggests your next command before you type
- **Context-Aware Assistance** - Understands your terminal output, project, and history

### 📦 Command Blocks
- **Visual Command History** - Every command is a collapsible block
- **Error Analysis** - Automatic error categorization and explanations
- **One-Click Re-run** - Run previous commands instantly

### ⚡ Modern Terminal
- **Beautiful UI** - Tokyo Night theme, smooth animations
- **WebGL Rendering** - Blazing fast terminal output
- **Full xterm.js** - All the terminal features you expect

### 🔧 Developer Experience
- **TypeScript Everything** - Backend, frontend, and CLI all in TypeScript
- **Daytona Integration** - Cloud dev environments out of the box
- **Multi-Model AI** - Claude & OpenAI support

## 🏃 Quick Start

```bash
# Clone
git clone https://github.com/your-org/daytona-terminal.git
cd daytona-terminal

# Install everything
make install

# Start development
make dev
```

Open http://localhost:3000 🎉

## 📦 Installation

### Development Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Add your API keys to .env
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# CLI
cd cli
npm install
npm link
```

### Docker

```bash
# Create .env with your API keys
cp backend/.env.example .env

# Start everything
docker-compose up -d
```

## ⚙️ Configuration

Create `backend/.env`:

```env
# Daytona (optional - works in local mode without)
DAYTONA_API_KEY=your-daytona-key

# AI (at least one required for AI features)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Features
ENABLE_PREDICTIVE_COMMANDS=true
ENABLE_AUTO_FIX=true
ENABLE_COMMAND_ANALYSIS=true
```

## 🖥️ CLI Usage

```bash
# List workspaces
dt list

# Create workspace with AI
dt create my-project --repo https://github.com/user/repo --ai claude

# Connect to terminal
dt connect <workspace-id>

# Interactive AI session
dt ai <workspace-id>

# Execute command
dt exec <workspace-id> "npm install"

# Show info
dt info
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Daytona Terminal                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐│
│  │  React UI   │   │   CLI       │   │     API Clients         ││
│  │  (xterm.js) │   │  (TypeScript│   │                         ││
│  └──────┬──────┘   └──────┬──────┘   └───────────┬─────────────┘│
│         │                 │                       │              │
│         └─────────────────┼───────────────────────┘              │
│                           │                                      │
│                    ┌──────▼──────┐                               │
│                    │   Fastify   │                               │
│                    │   Backend   │                               │
│                    └──────┬──────┘                               │
│                           │                                      │
│         ┌─────────────────┼─────────────────┐                    │
│         │                 │                 │                    │
│  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐            │
│  │  Daytona    │   │  Terminal   │   │     AI      │            │
│  │  Service    │   │  Service    │   │  Service    │            │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘            │
│         │                 │                 │                    │
└─────────┼─────────────────┼─────────────────┼────────────────────┘
          │                 │                 │
   ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
   │  Daytona.io │   │  node-pty   │   │  Claude/    │
   │     API     │   │  Sessions   │   │  OpenAI     │
   └─────────────┘   └─────────────┘   └─────────────┘
```

## 🎨 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, xterm.js, Zustand |
| **Backend** | Fastify, TypeScript, node-pty, WebSocket |
| **AI** | Anthropic Claude, OpenAI GPT-4 |
| **Infrastructure** | Daytona.io, Docker |

## 📡 API Reference

### WebSocket Protocol

Connect to `/ws/terminal/{sessionId}`:

```typescript
// Send input
{ type: 'input', data: 'ls -la\n' }

// Resize terminal
{ type: 'resize', cols: 120, rows: 40 }

// Receive output
{ type: 'output', data: '...' }

// Receive AI suggestion (auto-triggered on error)
{ type: 'suggestion', suggestion: { text: '...', commands: ['...'] } }

// Receive command block
{ type: 'block', block: { id, command, output, analysis } }
```

### REST Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/workspaces` | List workspaces |
| `POST /api/v1/workspaces` | Create workspace |
| `POST /api/v1/sessions` | Create terminal session |
| `POST /api/v1/ai/conversations` | Start AI conversation |
| `POST /api/v1/ai/conversations/:id/message` | Send message to AI |

## 🤝 Contributing

1. Fork it
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

<p align="center">
  Built with 💜 on <a href="https://daytona.io">Daytona.io</a>
</p>
