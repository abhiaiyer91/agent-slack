# 🖥️ sandterm

> **The AI-powered terminal that destroys Warp**

sandterm is a provider-agnostic AI terminal that runs anywhere - local, E2B, Daytona, or your own cloud. It's everything Warp does, but better.

## 🔥 Why sandterm > Warp

| Feature | Warp | sandterm |
|---------|------|----------|
| **AI** | Basic GPT chat | Multi-model (Claude, GPT-4) + native agent support |
| **Agents** | ❌ None | ✅ Claude Code, Codex, Aider built-in |
| **Predictive** | Basic autocomplete | Full command prediction with context |
| **Runs On** | Local only | Any sandbox (E2B, Daytona, Docker, local) |
| **Voice** | ❌ None | ✅ Voice commands |
| **Workflows** | Simple saved commands | Conditional workflows with AI generation |
| **Plugins** | ❌ None | ✅ Full plugin system |
| **Open Source** | ❌ Closed | ✅ Open source |

## ✨ Features

### 🤖 AI That Actually Helps

- **Command Prediction**: Predicts what you'll type before you type it
- **Auto-Fix**: Detects errors and suggests fixes automatically
- **Context-Aware Chat**: AI knows your cwd, git status, recent commands
- **Multi-Model**: Works with Claude, GPT-4, or local LLMs

### 🚀 Native AI Agent Support

Run AI coding assistants directly in sandboxes:

```bash
# Run Claude Code
sandterm agent start claude-code --sandbox my-project

# Run Aider
sandterm agent start aider --sandbox my-project

# Run OpenAI Codex
sandterm agent start codex --sandbox my-project
```

### 🎤 Voice Commands

Just speak:
- *"git status"* → runs `git status`
- *"commit update readme"* → runs `git commit -m "update readme"`
- *"run dev"* → runs `npm run dev`
- *"stop"* → sends Ctrl+C

### ⚡ Workflow Engine

Create and share automated workflows:

```typescript
const workflow = await workflowEngine.createWorkflow({
  name: 'Deploy',
  steps: [
    { id: '1', name: 'Test', command: 'npm test', onError: 'stop' },
    { id: '2', name: 'Build', command: 'npm run build' },
    { id: '3', name: 'Deploy', command: 'npm run deploy' },
  ],
});
```

Or generate with AI:
```typescript
const workflow = await workflowEngine.generateWorkflow('deploy to production with tests');
```

### 🔌 Plugin System

Extend sandterm with plugins:

```typescript
const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  
  onCommand(command) {
    if (command === 'gs') return { command: 'git status' };
  },
  
  commands: [
    { name: 'deploy', execute: async () => '...' },
  ],
};

pluginManager.loadPlugin(myPlugin);
```

### ☁️ Any Sandbox Provider

Run on local, E2B, Daytona, or build your own:

```bash
# Local (default)
SANDTERM_PROVIDER=local pnpm start

# E2B cloud sandboxes
E2B_API_KEY=xxx SANDTERM_PROVIDER=e2b pnpm start

# Daytona workspaces
DAYTONA_API_KEY=xxx SANDTERM_PROVIDER=daytona pnpm start
```

## 📦 Packages

| Package | Description |
|---------|-------------|
| `@sandterm/core` | Engine, AI, workflows, plugins, types |
| `@sandterm/providers` | Local, E2B, Daytona providers |
| `@sandterm/server` | API server |
| `@sandterm/cli` | Command-line interface |
| `@sandterm/web` | React web UI |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/yourname/sandterm.git
cd sandterm

# Install
pnpm install

# Build
pnpm build

# Run
pnpm start        # Start server
pnpm dev:web      # Start web UI
```

## 🔧 Configuration

```bash
# .env
SANDTERM_PROVIDER=local

# AI (pick one or both)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Cloud providers (optional)
E2B_API_KEY=...
DAYTONA_API_KEY=...
```

## 📖 API

### REST Endpoints

```
GET  /api/v1              - Server info
GET  /api/v1/sandboxes    - List sandboxes
POST /api/v1/sandboxes    - Create sandbox
POST /api/v1/sessions     - Create terminal session
POST /api/v1/ai/chat      - AI chat
```

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/terminal/SESSION_ID');

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  // Types: 'output', 'suggestion', 'block', 'prediction'
};

ws.send(JSON.stringify({ type: 'input', data: 'ls\n' }));
ws.send(JSON.stringify({ type: 'resize', cols: 120, rows: 40 }));
```

## 🎯 Roadmap

- [x] Provider-agnostic architecture
- [x] AI-powered command prediction
- [x] Native AI agent support
- [x] Voice commands
- [x] Workflow engine
- [x] Plugin system
- [x] Themes and split panes
- [ ] Session sharing
- [ ] Collaborative editing
- [ ] Mobile app
- [ ] VS Code extension

## 🤝 Contributing

PRs welcome! Let's make the best terminal ever.

## 📜 License

MIT
