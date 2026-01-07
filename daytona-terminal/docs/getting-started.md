# Getting Started with Daytona Terminal

This guide will help you get up and running with Daytona Terminal.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10+** - For the backend and CLI
- **Node.js 18+** - For the frontend
- **Git** - For cloning the repository
- **Docker** (optional) - For containerized deployment

## Installation Options

### Option 1: Local Development Setup

This is the recommended approach for development and testing.

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/daytona-terminal.git
cd daytona-terminal
```

#### 2. Set Up the Backend

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
DEBUG=true
ANTHROPIC_API_KEY=your-key-here  # Optional
OPENAI_API_KEY=your-key-here     # Optional
```

#### 3. Set Up the Frontend

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies
npm install
```

#### 4. Start the Services

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

#### 5. Access the Application

Open your browser and navigate to:
- **Web UI:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

### Option 2: Docker Deployment

For production or quick testing:

```bash
# Clone repository
git clone https://github.com/your-org/daytona-terminal.git
cd daytona-terminal

# Create environment file
cat > .env << EOF
DAYTONA_API_KEY=your-daytona-key
ANTHROPIC_API_KEY=your-anthropic-key
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
EOF

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

Access at http://localhost:3000

### Option 3: CLI Only

If you only need the command-line interface:

```bash
cd cli
pip install -e .

# Or install directly
pip install typer rich httpx websockets
```

## First Steps

### 1. Create Your First Workspace

Using the Web UI:
1. Click "Create Workspace" button
2. Enter a name (e.g., "my-project")
3. Optionally add a repository URL
4. Select an AI assistant (Claude or OpenAI)
5. Click "Create"

Using the CLI:
```bash
dt create my-project --repo https://github.com/user/repo --ai claude
```

### 2. Connect to the Terminal

Once the workspace is running:
- **Web UI:** Click on the workspace in the sidebar
- **CLI:** `dt connect <workspace-id>`

### 3. Use the AI Assistant

In the Web UI:
1. Toggle the AI panel using the 🤖 button
2. Type your question in the input field
3. Click "Send" or press Enter

In the CLI:
```bash
dt ai <workspace-id>
```

## Configuration

### Daytona Integration

To use cloud workspaces with Daytona.io:

1. Sign up at https://daytona.io
2. Get your API key from the dashboard
3. Add to `.env`:
   ```
   DAYTONA_API_URL=https://api.daytona.io
   DAYTONA_API_KEY=your-api-key
   ```

### AI Assistants

#### Claude (Anthropic)
1. Get an API key from https://console.anthropic.com
2. Add to `.env`: `ANTHROPIC_API_KEY=your-key`

#### OpenAI
1. Get an API key from https://platform.openai.com
2. Add to `.env`: `OPENAI_API_KEY=your-key`

## Next Steps

- Read the [API Reference](api-reference.md)
- Learn about [AI Integration](ai-integration.md)
- Explore [Advanced Configuration](advanced-config.md)

## Troubleshooting

### Common Issues

**WebSocket connection failed:**
- Check that the backend is running
- Verify the WebSocket URL in vite.config.ts

**AI assistant not responding:**
- Verify your API key is set correctly
- Check the backend logs for errors

**Terminal not connecting:**
- Ensure the session was created successfully
- Check browser console for errors

For more help, check the [FAQ](faq.md) or open an issue on GitHub.
