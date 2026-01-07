# Daytona Terminal

A feature-rich terminal application built on [Daytona.io](https://daytona.io) infrastructure with integrated AI coding assistant support (Claude Code & OpenAI).

![Daytona Terminal](docs/screenshot.png)

## Features

- 🖥️ **Modern Web Terminal** - Full-featured terminal with xterm.js
- 🤖 **AI Coding Assistants** - Integrated Claude Code and OpenAI support
- 🚀 **Daytona Integration** - Leverage Daytona.io for cloud development environments
- 📡 **Real-time WebSocket** - Low-latency terminal I/O
- 🔍 **Terminal Search** - Ctrl+F to search terminal history
- 📋 **Workspace Management** - Create, start, stop, and delete workspaces
- 💻 **CLI Tool** - Command-line interface for power users
- 🎨 **Beautiful UI** - Modern, dark-themed interface

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Daytona Terminal                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐│
│  │  React UI   │   │   CLI Tool  │   │     REST API Clients    ││
│  │  (xterm.js) │   │   (Typer)   │   │                         ││
│  └──────┬──────┘   └──────┬──────┘   └───────────┬─────────────┘│
│         │                 │                       │              │
│         └─────────────────┼───────────────────────┘              │
│                           │                                      │
│                    ┌──────▼──────┐                               │
│                    │   FastAPI   │                               │
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
   │  Daytona.io │   │  PTY/SSH    │   │  Claude/    │
   │     API     │   │  Sessions   │   │  OpenAI API │
   └─────────────┘   └─────────────┘   └─────────────┘
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker (optional)
- Daytona API key (optional, for cloud workspaces)

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/your-org/daytona-terminal.git
cd daytona-terminal
```

2. **Set up the backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
```

3. **Set up the frontend:**

```bash
cd frontend
npm install
```

4. **Start the development servers:**

```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

5. **Open in browser:**

Navigate to `http://localhost:3000`

### Using Docker

```bash
docker-compose up -d
```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Daytona Configuration
DAYTONA_API_URL=https://api.daytona.io
DAYTONA_API_KEY=your-daytona-api-key

# AI Integration
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Security
SECRET_KEY=your-secret-key

# Optional
DEBUG=true
```

### Running Without Daytona

The terminal can run in "local mode" without a Daytona API key. In this mode, it creates local PTY sessions instead of cloud workspaces.

## CLI Usage

Install the CLI:

```bash
cd cli
pip install -e .
```

### Commands

```bash
# List workspaces
dt list

# Create a workspace
dt create my-project --repo https://github.com/user/repo --ai claude

# Connect to a workspace terminal
dt connect <workspace-id>

# Start an AI assistant session
dt ai <workspace-id>

# Execute a command
dt exec <workspace-id> "ls -la"

# View info
dt info
```

## API Reference

### Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/workspaces` | List workspaces |
| POST | `/api/v1/workspaces` | Create workspace |
| GET | `/api/v1/workspaces/{id}` | Get workspace |
| PATCH | `/api/v1/workspaces/{id}` | Update workspace |
| DELETE | `/api/v1/workspaces/{id}` | Delete workspace |
| POST | `/api/v1/workspaces/{id}/start` | Start workspace |
| POST | `/api/v1/workspaces/{id}/stop` | Stop workspace |
| POST | `/api/v1/workspaces/{id}/exec` | Execute command |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/sessions` | List sessions |
| POST | `/api/v1/sessions` | Create session |
| GET | `/api/v1/sessions/{id}` | Get session |
| DELETE | `/api/v1/sessions/{id}` | Close session |
| POST | `/api/v1/sessions/{id}/resize` | Resize terminal |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/ai/assistants` | List AI assistants |
| POST | `/api/v1/ai/conversations` | Create conversation |
| POST | `/api/v1/ai/conversations/{id}/message` | Send message |

### WebSocket

Connect to `/ws/terminal/{session_id}` for real-time terminal I/O.

**Message Format:**

```json
// Input
{"type": "input", "data": "ls -la\n"}

// Resize
{"type": "resize", "cols": 120, "rows": 40}

// Output (from server)
{"type": "output", "data": "..."}
```

## AI Assistant Integration

### Claude Code

The integrated Claude assistant can:
- Analyze your code and terminal output
- Suggest commands to run
- Help debug errors
- Write and modify code

### OpenAI

OpenAI integration provides similar capabilities using GPT-4.

### Usage

1. Create a workspace with AI enabled:
   ```bash
   dt create my-project --ai claude
   ```

2. Use the AI panel in the web UI, or start a CLI session:
   ```bash
   dt ai <workspace-id>
   ```

3. Ask questions about your code:
   ```
   You: How do I fix this error?
   AI: Looking at the terminal output, the error is...
   ```

## Development

### Project Structure

```
daytona-terminal/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Configuration, logging
│   │   ├── models/        # Pydantic models
│   │   ├── services/      # Business logic
│   │   └── main.py        # FastAPI app
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── stores/        # Zustand stores
│   │   ├── api/           # API client
│   │   └── App.tsx
│   └── package.json
├── cli/
│   └── daytona_terminal_cli.py
├── docs/
└── docker-compose.yml
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# The built files will be in frontend/dist/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Daytona.io](https://daytona.io) - Cloud development environments
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [Anthropic](https://anthropic.com) - Claude AI
- [OpenAI](https://openai.com) - GPT API
