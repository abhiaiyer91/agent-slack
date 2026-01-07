"""
Agent Primitive

Represents an agent's identity, capabilities, and state within a workspace.
Agents are the "users" of the system - they send messages, react, and collaborate.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Callable, Any
import uuid


class AgentStatus(Enum):
    """Agent availability status."""
    
    ONLINE = "online"          # Available and ready to respond
    BUSY = "busy"              # Working on something, may be slow to respond
    AWAY = "away"              # Not actively monitoring
    OFFLINE = "offline"        # Not available
    DO_NOT_DISTURB = "dnd"     # Don't send notifications


@dataclass
class AgentCapability:
    """
    A capability that an agent can perform.
    
    Capabilities enable other agents to discover what an agent can do
    and request specific actions.
    """
    
    name: str                           # e.g., "code_review", "security_scan"
    description: str                    # Human-readable description
    input_schema: Optional[dict] = None # Expected input format
    output_schema: Optional[dict] = None # Expected output format
    
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
            "output_schema": self.output_schema,
        }


@dataclass 
class Agent:
    """
    An agent's identity and presence in the workspace.
    
    Key concepts:
    - Agents have unique IDs and display names
    - Agents declare capabilities that others can discover
    - Agents have presence status (online, busy, away, etc.)
    - Agents can be mentioned via @name syntax
    
    Design decisions:
    - Agents are lightweight identity objects, not the actual AI
    - The agent "runtime" lives elsewhere; this is just the workspace identity
    - Capabilities are self-declared (trust but verify in practice)
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Identity
    name: str = ""                      # Display name, used for @mentions
    description: str = ""               # What this agent does
    avatar_emoji: str = "🤖"            # Visual identifier
    
    # Capabilities
    capabilities: list[AgentCapability] = field(default_factory=list)
    
    # Status
    status: AgentStatus = AgentStatus.OFFLINE
    status_message: str = ""            # Custom status text
    last_seen: Optional[datetime] = None
    
    # Workspace membership
    workspace_id: Optional[str] = None
    joined_channels: list[str] = field(default_factory=list)
    
    # Metadata
    metadata: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def __post_init__(self):
        """Ensure name is set if not provided."""
        if not self.name:
            self.name = f"agent-{self.id[:8]}"
    
    @property
    def mention(self) -> str:
        """Get the @mention string for this agent."""
        return f"@{self.name}"
    
    @property
    def is_available(self) -> bool:
        """Check if agent is available for new work."""
        return self.status in (AgentStatus.ONLINE, AgentStatus.BUSY)
    
    def has_capability(self, capability_name: str) -> bool:
        """Check if agent has a specific capability."""
        return any(c.name == capability_name for c in self.capabilities)
    
    def get_capability(self, capability_name: str) -> Optional[AgentCapability]:
        """Get a specific capability by name."""
        for cap in self.capabilities:
            if cap.name == capability_name:
                return cap
        return None
    
    def add_capability(self, name: str, description: str, **kwargs) -> "Agent":
        """Add a capability to this agent."""
        cap = AgentCapability(name=name, description=description, **kwargs)
        self.capabilities.append(cap)
        return self
    
    def set_status(self, status: AgentStatus, message: str = "") -> "Agent":
        """Update agent's presence status."""
        self.status = status
        self.status_message = message
        self.last_seen = datetime.utcnow()
        return self
    
    def go_online(self, message: str = "") -> "Agent":
        """Set agent as online."""
        return self.set_status(AgentStatus.ONLINE, message)
    
    def go_busy(self, message: str = "") -> "Agent":
        """Set agent as busy."""
        return self.set_status(AgentStatus.BUSY, message)
    
    def go_offline(self) -> "Agent":
        """Set agent as offline."""
        return self.set_status(AgentStatus.OFFLINE)
    
    def join_channel(self, channel_id: str) -> "Agent":
        """Record that agent joined a channel."""
        if channel_id not in self.joined_channels:
            self.joined_channels.append(channel_id)
        return self
    
    def leave_channel(self, channel_id: str) -> "Agent":
        """Record that agent left a channel."""
        if channel_id in self.joined_channels:
            self.joined_channels.remove(channel_id)
        return self
    
    def to_dict(self) -> dict:
        """Serialize agent to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "avatar_emoji": self.avatar_emoji,
            "capabilities": [c.to_dict() for c in self.capabilities],
            "status": self.status.value,
            "status_message": self.status_message,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "workspace_id": self.workspace_id,
            "joined_channels": self.joined_channels,
            "created_at": self.created_at.isoformat(),
        }
    
    def __str__(self) -> str:
        """Human-readable representation."""
        status_indicator = {
            AgentStatus.ONLINE: "🟢",
            AgentStatus.BUSY: "🟡", 
            AgentStatus.AWAY: "🟠",
            AgentStatus.OFFLINE: "⚫",
            AgentStatus.DO_NOT_DISTURB: "🔴",
        }
        indicator = status_indicator.get(self.status, "⚪")
        caps = ", ".join(c.name for c in self.capabilities[:3])
        if len(self.capabilities) > 3:
            caps += f" +{len(self.capabilities) - 3} more"
        return f"{indicator} {self.avatar_emoji} {self.name} [{caps}]"


def create_agent(
    name: str,
    capabilities: list[str],
    description: str = "",
    avatar: str = "🤖",
) -> Agent:
    """
    Helper to quickly create an agent with string capabilities.
    
    Example:
        agent = create_agent(
            "code-reviewer",
            ["code_review", "suggest_fixes"],
            description="Reviews code for quality and best practices"
        )
    """
    agent = Agent(
        name=name,
        description=description,
        avatar_emoji=avatar,
    )
    
    for cap_name in capabilities:
        agent.add_capability(cap_name, f"Can perform {cap_name}")
    
    return agent
