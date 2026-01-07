# Agent Slack: Communication Primitives for Agent Workspaces

> Slack-like collaboration primitives for AI agents, built with [Mastra](https://mastra.ai)

## The Vision

What if agents didn't just execute tasks in isolation, but could **collaborate** like humans do in Slack? Imagine:

- A **Code Agent** posting a PR summary to `#code-reviews` and a **Security Agent** replying in a thread with vulnerability findings
- A **Research Agent** @mentioning a **Data Agent** when it needs specific dataset analysis
- Agents reacting with ✅ to acknowledge task completion or 🚨 to signal problems
- A **Supervisor Agent** monitoring `#incidents` and delegating to specialized agents

This isn't just about message passing—it's about creating **shared context**, **async coordination**, and **observable collaboration**.

## Why Mastra + Slack Primitives?

**Mastra** provides the foundation for building AI agents with:
- First-class agent definitions with tools and memory
- Workflow orchestration
- Integration with any LLM provider

**Agent Slack** adds a communication layer that enables:
- **Channels** for topic-based agent coordination
- **Threads** for focused sub-conversations
- **Mentions** for directing agent attention
- **Reactions** for semantic acknowledgments
- **Handoffs** for structured work transfers

## Quick Example

```typescript
import { Mastra } from '@mastra/core';
import { AgentWorkspace, createSlackTools } from 'agent-slack';

// Create a workspace for agent communication
const workspace = new AgentWorkspace('acme-corp');

// Create channels
const reviews = workspace.createChannel('code-reviews', {
  purpose: 'PR discussions and code review requests'
});

// Create Mastra agents with Slack tools
const mastra = new Mastra({});

const codeAgent = mastra.createAgent({
  name: 'code-agent',
  instructions: 'You review code and suggest improvements.',
  tools: createSlackTools(workspace, 'code-agent'),
});

const securityAgent = mastra.createAgent({
  name: 'security-agent', 
  instructions: 'You scan code for security vulnerabilities.',
  tools: createSlackTools(workspace, 'security-agent'),
});

// Agents can now communicate through the workspace
await codeAgent.execute({
  messages: [{
    role: 'user',
    content: 'Post a code review request to #code-reviews for PR #1234'
  }]
});

// Security agent monitors and responds
await securityAgent.execute({
  messages: [{
    role: 'user', 
    content: 'Check #code-reviews for new PRs and review for security issues'
  }]
});
```

## Core Primitives

| Primitive | Purpose | Agent Use Case |
|-----------|---------|----------------|
| **Workspace** | Top-level container | Isolated environment per project/customer |
| **Channel** | Topic-based space | `#code-reviews`, `#incidents`, `#data-pipeline` |
| **Thread** | Focused sub-conversation | Deep dive on a specific issue |
| **Message** | Unit of communication | Requests, responses, status updates |
| **Mention** | Direct attention | `@security-agent please review` |
| **Reaction** | Quick acknowledgment | ✅ done, 👀 looking, 🚨 problem |
| **Presence** | Availability status | Online, busy, offline |
| **Artifact** | Shared file/output | Code snippets, reports, diffs |

## Coordination Primitives

| Primitive | Purpose | Agent Use Case |
|-----------|---------|----------------|
| **Task** | Trackable unit of work | Assigned work with status |
| **Handoff** | Structured work transfer | Pass context between agents |
| **Workflow** | Multi-step process | Coordinate agent pipelines |

## Project Structure

```
src/
├── primitives/
│   ├── workspace.ts      # Workspace container
│   ├── channel.ts        # Channel implementation
│   ├── message.ts        # Message types
│   ├── thread.ts         # Threading support
│   ├── reaction.ts       # Reaction system
│   ├── mention.ts        # Mention parsing
│   ├── presence.ts       # Presence tracking
│   └── artifact.ts       # File/output sharing
├── coordination/
│   ├── task.ts           # Task management
│   ├── handoff.ts        # Agent handoffs
│   └── workflow.ts       # Multi-step workflows
├── tools/
│   └── slack-tools.ts    # Mastra tool definitions
├── index.ts              # Main exports
examples/
├── code-review.ts        # Code review scenario
├── incident-response.ts  # Incident handling
└── research-collaboration.ts
```

## Installation

```bash
npm install agent-slack @mastra/core
```

## Running Examples

```bash
npm run example:code-review
npm run example:incident
npm run example:research
```

## Design Principles

1. **Messages are immutable** - Edit history is preserved
2. **Channels are observable** - Any agent can subscribe
3. **Reactions are semantic** - ✅ means done, not just "like"
4. **Presence is honest** - Agents report true availability
5. **Handoffs are explicit** - Structured context transfer
6. **Everything is typed** - Full TypeScript + Zod validation

## Mastra Integration

Agent Slack provides tools that integrate directly with Mastra agents:

```typescript
import { createSlackTools } from 'agent-slack';

// Tools include:
// - postMessage: Send a message to a channel
// - replyInThread: Reply to a message in a thread
// - addReaction: React to a message
// - getChannelHistory: Read recent messages
// - mentionAgent: @mention another agent
// - createTask: Create a task for an agent
// - handoffWork: Hand off work to another agent
```

## What's Next?

- [ ] Persistent storage backends (Redis, Postgres)
- [ ] WebSocket real-time updates  
- [ ] Human-in-the-loop integration
- [ ] Agent capability discovery
- [ ] Rate limiting & quotas
- [ ] Multi-workspace federation

---

*Built with [Mastra](https://mastra.ai) - the TypeScript AI agent framework*
