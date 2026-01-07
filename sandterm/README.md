# 🖥️ sandterm

> The AI-powered terminal for any sandbox provider

sandterm is a provider-agnostic AI terminal that runs anywhere. Connect to local terminals, Daytona workspaces, E2B sandboxes, or build your own provider.

## ✨ Features

- **🔌 Provider Agnostic**: Works with Local, Daytona, E2B, or custom providers
- **🤖 AI-Powered**: Automatic error detection, fixes, and intelligent suggestions
- **💻 Modern UI**: Beautiful block-based terminal with command history
- **⌨️ Powerful CLI**: Full-featured command-line interface
- **🔧 Multi-Model AI**: Works with Claude (Anthropic) or GPT-4 (OpenAI)
- **📦 Monorepo**: Modular architecture with shared types

## 📦 Packages

| Package | Description |
|---------|-------------|
| `@sandterm/core` | Core engine, server, types, and AI |
| `@sandterm/providers` | Built-in providers (Local, Daytona, E2B) |
| `@sandterm/server` | Combined server with all providers |
| `@sandterm/cli` | Command-line interface |
| `@sandterm/web` | Web-based terminal UI |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repo
git clone https://github.com/yourname/sandterm.git
cd sandterm

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Run Locally

```bash
# Start the server (local provider)
pnpm start

# In another terminal, use the CLI
pnpm cli list              # List sandboxes
pnpm cli create my-project # Create sandbox
pnpm cli connect <id>      # Connect to terminal

# Or run the web UI
pnpm dev:web
```

## 🔌 Providers

### Local (Default)

Runs directly on your machine using node-pty.

```bash
# No configuration needed
SANDTERM_PROVIDER=local pnpm start
```

### E2B (Compute SDK)

Cloud sandboxes using [E2B](https://e2b.dev) - perfect for AI agents.

sandterm uses the official **E2B SDK** (`e2b` v1.x) which provides:
- Secure cloud sandboxes
- PTY terminals
- File system access
- Command execution
- Multiple templates (base, python, node, etc.)

```bash
# Set your API key
export E2B_API_KEY=your-key-here
SANDTERM_PROVIDER=e2b pnpm start
```

#### E2B Templates

When creating a sandbox, you can specify a template:

```typescript
import { createSandterm, providerRegistry } from '@sandterm/core';
import { createE2BProvider } from '@sandterm/providers';

providerRegistry.register('e2b', createE2BProvider);

const sandterm = createSandterm({
  provider: 'e2b',
  providerConfig: { apiKey: 'your-e2b-api-key' }
});

await sandterm.init();

// Create a Python sandbox
const sandbox = await sandterm.createSandbox({
  name: 'my-python-env',
  template: 'python',  // or 'node', 'go', 'rust', 'base'
});
```

### Daytona

Cloud workspaces using [Daytona](https://daytona.io).

```bash
# Set your API key
export DAYTONA_API_KEY=your-key-here
SANDTERM_PROVIDER=daytona pnpm start
```

### Custom Provider

Create your own provider by implementing `SandboxProvider`:

```typescript
import { SandboxProvider, providerRegistry } from '@sandterm/core';

class MyProvider implements SandboxProvider {
  readonly id = 'my-provider';
  readonly name = 'My Provider';
  readonly description = 'Custom cloud provider';

  // Implement the interface...
}

providerRegistry.register('my-provider', () => new MyProvider());
```

## 🤖 AI Configuration

sandterm uses AI for:
- Error detection and auto-fix suggestions
- Command prediction
- Interactive chat

```bash
# Anthropic (Claude) - recommended
export ANTHROPIC_API_KEY=your-key-here

# Or OpenAI (GPT-4)
export OPENAI_API_KEY=your-key-here

# Choose provider
export DEFAULT_AI_PROVIDER=anthropic  # or 'openai'
```

## 📖 API

### REST Endpoints

```
GET  /api/v1              - Server info
GET  /api/v1/sandboxes    - List sandboxes
POST /api/v1/sandboxes    - Create sandbox
GET  /api/v1/sandboxes/:id - Get sandbox
POST /api/v1/sandboxes/:id/start - Start sandbox
POST /api/v1/sandboxes/:id/stop  - Stop sandbox
DELETE /api/v1/sandboxes/:id - Delete sandbox

POST /api/v1/sessions     - Create terminal session
GET  /api/v1/sessions/:id/blocks - Get command blocks
DELETE /api/v1/sessions/:id - Close session

POST /api/v1/ai/chat      - AI chat
```

### WebSocket

Connect to `/ws/terminal/:sessionId` for real-time terminal:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/terminal/session-id');

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  // msg.type: 'output' | 'suggestion' | 'block'
};

ws.send(JSON.stringify({ type: 'input', data: 'ls -la\n' }));
ws.send(JSON.stringify({ type: 'resize', cols: 120, rows: 40 }));
```

## 🛠️ Development

```bash
# Start everything in dev mode
pnpm dev

# Run specific packages
pnpm dev:core  # Server only
pnpm dev:web   # Web UI only

# Type check
pnpm type-check

# Lint
pnpm lint
```

## 📜 License

MIT
