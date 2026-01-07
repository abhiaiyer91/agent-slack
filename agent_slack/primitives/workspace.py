"""
Workspace Primitive

The top-level container for agent collaboration. A workspace contains
channels, agents, and manages the overall communication environment.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Callable, Any
import uuid

from .agent import Agent, AgentStatus
from .channel import Channel, ChannelType, create_dm_channel, create_group_dm
from .message import Message, MessageType


@dataclass
class WorkspaceSettings:
    """Configuration for a workspace."""
    
    # Message settings
    max_message_length: int = 40000
    allow_message_editing: bool = True
    message_retention_days: Optional[int] = None  # None = forever
    
    # Channel settings
    default_channel_type: ChannelType = ChannelType.PUBLIC
    allow_public_channels: bool = True
    
    # Agent settings
    require_agent_approval: bool = False
    max_agents: Optional[int] = None
    
    # Notification settings
    default_notifications: str = "mentions"  # "all", "mentions", "none"


@dataclass
class Workspace:
    """
    A workspace for agent collaboration.
    
    Key concepts:
    - Workspaces are isolated environments (like Slack workspaces)
    - Agents must be registered to participate
    - Channels live within workspaces
    - All messages flow through the workspace
    
    Design decisions:
    - Workspace is the "god object" that manages everything
    - In production, this would be backed by a database
    - Event hooks allow extensibility (logging, webhooks, etc.)
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Identity
    name: str = ""
    description: str = ""
    icon_emoji: str = "🏢"
    
    # Settings
    settings: WorkspaceSettings = field(default_factory=WorkspaceSettings)
    
    # Registries
    agents: dict[str, Agent] = field(default_factory=dict)
    channels: dict[str, Channel] = field(default_factory=dict)
    channels_by_name: dict[str, str] = field(default_factory=dict)  # name -> id
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    # Event hooks
    _message_hooks: list[Callable[[Message], Any]] = field(default_factory=list, repr=False)
    _event_hooks: list[Callable[[str, dict], Any]] = field(default_factory=list, repr=False)
    
    def __post_init__(self):
        """Initialize workspace with default channel."""
        if not self.name:
            self.name = f"workspace-{self.id[:8]}"
        
        # Create default #general channel
        self.create_channel("general", purpose="General discussion")
    
    # ==================== Agent Management ====================
    
    def register_agent(self, agent: Agent) -> Agent:
        """
        Register an agent to the workspace.
        
        Agents must be registered before they can participate.
        """
        if self.settings.max_agents and len(self.agents) >= self.settings.max_agents:
            raise ValueError(f"Workspace has reached max agents ({self.settings.max_agents})")
        
        agent.workspace_id = self.id
        self.agents[agent.id] = agent
        
        # Auto-join default channels
        general = self.get_channel("general")
        if general:
            self.join_channel(agent.id, general.id)
        
        self._emit_event("agent_registered", {"agent_id": agent.id})
        return agent
    
    def register(self, *agents: Agent) -> list[Agent]:
        """Register multiple agents at once."""
        return [self.register_agent(agent) for agent in agents]
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get an agent by ID."""
        return self.agents.get(agent_id)
    
    def get_agent_by_name(self, name: str) -> Optional[Agent]:
        """Get an agent by name (for @mention lookup)."""
        for agent in self.agents.values():
            if agent.name == name:
                return agent
        return None
    
    def list_agents(self, status: Optional[AgentStatus] = None) -> list[Agent]:
        """List all agents, optionally filtered by status."""
        agents = list(self.agents.values())
        if status:
            agents = [a for a in agents if a.status == status]
        return agents
    
    def find_agents_by_capability(self, capability: str) -> list[Agent]:
        """Find all agents with a specific capability."""
        return [a for a in self.agents.values() if a.has_capability(capability)]
    
    # ==================== Channel Management ====================
    
    def create_channel(
        self,
        name: str,
        purpose: str = "",
        channel_type: ChannelType = ChannelType.PUBLIC,
        creator_id: Optional[str] = None,
    ) -> Channel:
        """Create a new channel in the workspace."""
        # Normalize name
        name = name.lower().replace(" ", "-")
        
        if name in self.channels_by_name:
            raise ValueError(f"Channel #{name} already exists")
        
        channel = Channel(
            name=name,
            purpose=purpose,
            channel_type=channel_type,
            workspace_id=self.id,
        )
        
        # Add creator as admin if specified
        if creator_id:
            channel.add_member(creator_id, role="admin")
        
        self.channels[channel.id] = channel
        self.channels_by_name[name] = channel.id
        
        self._emit_event("channel_created", {
            "channel_id": channel.id,
            "name": name,
            "creator_id": creator_id,
        })
        
        return channel
    
    def get_channel(self, name_or_id: str) -> Optional[Channel]:
        """Get a channel by name or ID."""
        # Try by ID first
        if name_or_id in self.channels:
            return self.channels[name_or_id]
        
        # Try by name
        channel_id = self.channels_by_name.get(name_or_id.lstrip("#"))
        if channel_id:
            return self.channels[channel_id]
        
        return None
    
    def list_channels(
        self,
        include_private: bool = False,
        agent_id: Optional[str] = None,
    ) -> list[Channel]:
        """
        List channels in the workspace.
        
        If agent_id is specified, only show channels the agent can see.
        """
        channels = []
        
        for channel in self.channels.values():
            # Skip DMs
            if channel.is_dm:
                continue
            
            # Check visibility
            if channel.channel_type == ChannelType.PRIVATE:
                if not include_private:
                    continue
                if agent_id and not channel.is_member(agent_id):
                    continue
            
            channels.append(channel)
        
        return sorted(channels, key=lambda c: c.name)
    
    def join_channel(self, agent_id: str, channel_id: str) -> bool:
        """Have an agent join a channel."""
        agent = self.agents.get(agent_id)
        channel = self.channels.get(channel_id)
        
        if not agent or not channel:
            return False
        
        channel.add_member(agent_id)
        agent.join_channel(channel_id)
        
        self._emit_event("channel_joined", {
            "agent_id": agent_id,
            "channel_id": channel_id,
        })
        
        return True
    
    def leave_channel(self, agent_id: str, channel_id: str) -> bool:
        """Have an agent leave a channel."""
        agent = self.agents.get(agent_id)
        channel = self.channels.get(channel_id)
        
        if not agent or not channel:
            return False
        
        channel.remove_member(agent_id)
        agent.leave_channel(channel_id)
        
        self._emit_event("channel_left", {
            "agent_id": agent_id,
            "channel_id": channel_id,
        })
        
        return True
    
    def get_dm_channel(self, agent1_id: str, agent2_id: str) -> Channel:
        """Get or create a DM channel between two agents."""
        # Check if DM already exists
        for channel in self.channels.values():
            if channel.channel_type == ChannelType.DIRECT:
                members = set(channel.members.keys())
                if members == {agent1_id, agent2_id}:
                    return channel
        
        # Create new DM
        channel = create_dm_channel(agent1_id, agent2_id)
        channel.workspace_id = self.id
        self.channels[channel.id] = channel
        
        return channel
    
    # ==================== Messaging ====================
    
    def post_message(
        self,
        sender_id: str,
        channel_id: str,
        content: str,
        message_type: MessageType = MessageType.TEXT,
        **kwargs,
    ) -> Message:
        """
        Post a message to a channel.
        
        This is the main entry point for sending messages.
        """
        agent = self.agents.get(sender_id)
        channel = self.channels.get(channel_id)
        
        if not agent:
            raise ValueError(f"Agent {sender_id} not found")
        if not channel:
            raise ValueError(f"Channel {channel_id} not found")
        if not channel.is_member(sender_id):
            raise ValueError(f"Agent {sender_id} is not a member of channel")
        
        # Validate message length
        if len(content) > self.settings.max_message_length:
            raise ValueError(f"Message exceeds max length ({self.settings.max_message_length})")
        
        message = Message(
            sender_id=sender_id,
            channel_id=channel_id,
            content=content,
            message_type=message_type,
            **kwargs,
        )
        
        channel.post_message(message)
        
        # Update agent's last seen
        agent.last_seen = datetime.utcnow()
        
        # Run hooks
        for hook in self._message_hooks:
            hook(message)
        
        self._emit_event("message_posted", {
            "message_id": message.id,
            "sender_id": sender_id,
            "channel_id": channel_id,
        })
        
        return message
    
    def get_messages(
        self,
        channel_id: str,
        limit: int = 100,
        before: Optional[datetime] = None,
        after: Optional[datetime] = None,
    ) -> list[Message]:
        """Get messages from a channel."""
        channel = self.channels.get(channel_id)
        if not channel:
            return []
        
        return channel.get_messages(limit=limit, before=before, after=after)
    
    # ==================== Event System ====================
    
    def on_message(self, callback: Callable[[Message], Any]) -> None:
        """Register a callback for new messages."""
        self._message_hooks.append(callback)
    
    def on_event(self, callback: Callable[[str, dict], Any]) -> None:
        """Register a callback for workspace events."""
        self._event_hooks.append(callback)
    
    def _emit_event(self, event_type: str, data: dict) -> None:
        """Emit an event to all registered hooks."""
        for hook in self._event_hooks:
            hook(event_type, data)
    
    # ==================== Serialization ====================
    
    def to_dict(self) -> dict:
        """Serialize workspace to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon_emoji": self.icon_emoji,
            "agent_count": len(self.agents),
            "channel_count": len(self.channels),
            "created_at": self.created_at.isoformat(),
        }
    
    def __str__(self) -> str:
        """Human-readable representation."""
        return f"{self.icon_emoji} {self.name} ({len(self.agents)} agents, {len(self.channels)} channels)"
