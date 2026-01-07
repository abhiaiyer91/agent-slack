# AI Integration Guide

Daytona Terminal integrates powerful AI coding assistants to help you write, debug, and understand code directly within your terminal sessions.

## Supported AI Assistants

### Claude (Anthropic)

Claude is Anthropic's AI assistant, optimized for coding tasks with:
- Strong code understanding and generation
- Excellent at explaining complex concepts
- Good at debugging and error analysis

**Model:** Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)

### OpenAI GPT

OpenAI's GPT-4 offers:
- Broad knowledge base
- Good code generation
- Strong natural language understanding

**Model:** GPT-4o (gpt-4o)

## Setting Up AI Assistants

### Configuration

Add your API keys to the backend `.env` file:

```env
# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
OPENAI_API_KEY=sk-...
```

### Verifying Setup

Check if AI is configured:

```bash
# CLI
dt info

# API
curl http://localhost:8000/api/v1
```

The response will show which integrations are enabled.

## Using AI in the Web UI

### AI Panel

1. Click the 🤖 button to toggle the AI panel
2. The panel appears on the right side of the terminal

### Asking Questions

Type your question in the input field:
- "How do I fix this error?"
- "Write a Python script to parse JSON"
- "Explain what this command does"

### Terminal Context

Check "Include terminal context" to share recent terminal output with the AI. This helps the AI understand:
- Current directory and files
- Recent command output
- Error messages

### Executing Suggestions

When the AI suggests commands:
1. Click the "▶ Run" button to execute in terminal
2. Or click a suggested command chip at the bottom

## Using AI in the CLI

### Interactive Session

Start an AI chat session:

```bash
dt ai <workspace-id>
```

This opens an interactive prompt where you can:
- Ask questions
- Get command suggestions
- Execute suggested commands by number

Example session:

```
🤖 AI Session
AI Assistant (claude) ready.
Type your questions or commands. Type 'exit' to quit.

You: How do I find all Python files in this directory?

AI:
To find all Python files, you can use the `find` command:

```bash
find . -name "*.py"
```

Or use `fd` if installed (faster):

```bash
fd -e py
```

Suggested commands:
  1. find . -name "*.py"
  2. fd -e py

Enter number to execute, or press Enter to skip: 1

Executing: find . -name "*.py"
./src/main.py
./tests/test_main.py
```

### One-off Queries

For quick questions without an interactive session, use the API directly:

```bash
curl -X POST "http://localhost:8000/api/v1/ai/conversations/{id}/message" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "How do I list files?", "include_terminal_context": true}'
```

## API Reference

### Create Conversation

```http
POST /api/v1/ai/conversations?session_id={session_id}&assistant_type=claude
```

### Send Message

```http
POST /api/v1/ai/conversations/{conversation_id}/message
Content-Type: application/json

{
  "prompt": "Your question here",
  "include_terminal_context": true,
  "include_file_context": false,
  "files": [],
  "auto_execute": false
}
```

**Response:**

```json
{
  "message": "AI response with markdown...",
  "suggested_commands": ["ls -la", "git status"],
  "code_blocks": [
    {"language": "bash", "content": "ls -la"}
  ],
  "requires_confirmation": true,
  "conversation_id": "uuid"
}
```

## Best Practices

### Effective Prompts

**Good prompts:**
- "This command failed with 'permission denied'. How do I fix it?"
- "Write a bash script to backup all .js files to a backup folder"
- "Explain what this error means: [paste error]"

**Better prompts with context:**
- Enable "Include terminal context" for relevant sessions
- Reference specific files or line numbers
- Describe what you're trying to achieve

### Security Considerations

1. **API Keys:** Keep your API keys secret
2. **Sensitive Data:** Be careful when sharing terminal context that might contain secrets
3. **Auto-execute:** Only enable `auto_execute` for trusted environments

### Cost Management

Both Claude and OpenAI charge per token. To manage costs:
- Limit terminal context size (default: 5KB)
- Clear conversations when done
- Use efficient prompts

## Custom System Prompts

You can customize the AI's behavior with a system prompt:

```python
# API example
{
  "session_id": "...",
  "assistant_type": "claude",
  "system_prompt": "You are a security-focused AI. Always check code for vulnerabilities."
}
```

## Troubleshooting

### AI Not Responding

1. Check API key is set correctly
2. Verify backend logs for errors
3. Check rate limits on your API account

### Slow Responses

1. Reduce terminal context size
2. Keep prompts concise
3. Consider using a faster model

### Incorrect Suggestions

1. Provide more context
2. Be specific about your environment
3. Correct the AI and it will learn from the conversation

## Future Features

- [ ] Local LLM support (Ollama)
- [ ] Code completion in terminal
- [ ] Automatic error detection and suggestions
- [ ] Custom tool/function definitions
