# Agent Slack: Communication Primitives for Agent Workspaces

> An exploration of what happens when agents can communicate in Slack-like workspaces

## The Vision

What if agents didn't just execute tasks in isolation, but could **collaborate** like humans do in Slack? Imagine:

- A **Code Agent** posting a PR summary to `#code-reviews` and a **Security Agent** replying in a thread with vulnerability findings
- A **Research Agent** @mentioning a **Data Agent** when it needs specific dataset analysis
- Agents reacting with ✅ to acknowledge task completion or 🚨 to signal problems
- A **Supervisor Agent** monitoring `#incidents` and delegating to specialized agents

This isn't just about message passing—it's about creating **shared context**, **async coordination**, and **observable collaboration**.

## Why Slack-like Primitives?

### 1. **Shared Context Through Channels**
Channels create topical spaces where relevant agents can observe and participate. Unlike direct API calls, channels allow:
- Multiple agents to observe the same conversation
- Late-joining agents to catch up via history
- Human operators to monitor agent activity

### 2. **Threading for Focused Work**
Threads keep conversations organized:
- Main channel stays high-level
- Deep dives happen in threads
- Easy to follow decision trails

### 3. **Async by Default**
Agents don't need to be "online" simultaneously:
- Post a request, get a response when the agent is available
- Queue-like behavior with human-readable history
- Natural backpressure through presence indicators

### 4. **Observable & Auditable**
Every interaction is logged:
- Debug agent behavior by reading conversations
- Understand why decisions were made
- Human operators can intervene at any point

## Core Primitives

| Primitive | Purpose | Agent Use Case |
|-----------|---------|----------------|
| **Workspace** | Top-level container | Isolated environment per project/customer |
| **Channel** | Topic-based space | `#code-reviews`, `#incidents`, `#data-pipeline` |
| **Thread** | Focused sub-conversation | Deep dive on a specific issue |
| **Message** | Unit of communication | Requests, responses, status updates |
| **Agent** | Identity & capabilities | Who's talking, what can they do |
| **Mention** | Direct attention | `@security-agent please review` |
| **Reaction** | Quick acknowledgment | ✅ done, 👀 looking, 🚨 problem |
| **Presence** | Availability status | Online, busy, offline |
| **Artifact** | Shared file/output | Code snippets, reports, images |

## Extended Primitives

| Primitive | Purpose | Agent Use Case |
|-----------|---------|----------------|
| **Bookmark** | Quick reference | Link to relevant docs/resources |
| **Pin** | Important message | Key decisions, reference information |
| **Workflow** | Automated sequences | Trigger agent chains on events |
| **Huddle** | Synchronous collaboration | Real-time multi-agent problem solving |
| **Canvas** | Shared document | Collaborative output building |

## Project Structure

```
agent_slack/
├── primitives/
│   ├── workspace.py      # Workspace container
│   ├── channel.py        # Channel implementation
│   ├── message.py        # Message types
│   ├── thread.py         # Threading support
│   ├── agent.py          # Agent identity
│   ├── reaction.py       # Reaction system
│   ├── mention.py        # Mention parsing
│   ├── presence.py       # Presence tracking
│   └── artifact.py       # File/output sharing
├── coordination/
│   ├── handoff.py        # Agent-to-agent handoffs
│   ├── task.py           # Task assignment
│   └── workflow.py       # Multi-step workflows
├── examples/
│   ├── code_review.py    # Code review scenario
│   ├── incident.py       # Incident response scenario
│   └── research.py       # Research collaboration scenario
└── README.md
```

## Quick Example

```python
from agent_slack import Workspace, Agent, Channel

# Create a workspace
workspace = Workspace("acme-corp")

# Register agents
code_agent = Agent("code-agent", capabilities=["code_review", "refactor"])
security_agent = Agent("security-agent", capabilities=["vulnerability_scan", "audit"])

workspace.register(code_agent, security_agent)

# Create channels
reviews = workspace.create_channel("code-reviews", purpose="PR discussions")

# Agent posts a message
msg = await code_agent.post(reviews, """
    📋 **New PR Ready for Review**
    
    PR #1234: Add user authentication
    Changes: +342 / -28
    
    Key changes:
    - JWT token implementation
    - Password hashing with bcrypt
    - Session management
    
    @security-agent please review auth implementation
""")

# Security agent responds in thread
await security_agent.reply(msg, """
    👀 Reviewing now...
    
    Initial findings:
    - ✅ bcrypt cost factor looks good (12)
    - ⚠️ JWT secret should come from env, not config
    - 🚨 Missing rate limiting on login endpoint
    
    See attached report for details.
""", artifacts=[security_report])

# Acknowledge with reaction
await security_agent.react(msg, "eyes")
```

## Installation

```bash
pip install -e .
```

## Running Examples

```bash
python -m examples.code_review
python -m examples.incident
python -m examples.research
```

## Design Principles

1. **Messages are immutable** - Edit history is preserved
2. **Channels are observable** - Any agent can subscribe
3. **Threads are optional** - Not every message needs a reply
4. **Reactions are semantic** - ✅ means done, not just "like"
5. **Presence is honest** - Agents report true availability
6. **Artifacts are first-class** - Share outputs, not just text

## What's Next?

- [ ] Persistent storage backends (Redis, Postgres)
- [ ] WebSocket real-time updates
- [ ] Human-in-the-loop integration
- [ ] Agent capability discovery
- [ ] Rate limiting & quotas
- [ ] Multi-workspace federation

---

*This is an exploration project. The goal is to discover what primitives feel right for agent collaboration, not to build a production Slack clone.*
