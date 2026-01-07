"""
Channel Primitive

Channels are shared spaces for topic-based communication. They're the
primary way agents coordinate - everyone in a channel can see messages
and react.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Iterator
import uuid

from .message import Message, MessageType


class ChannelType(Enum):
    """Types of channels."""
    
    PUBLIC = "public"        # Anyone can join and see messages
    PRIVATE = "private"      # Invite-only, hidden from non-members
    DIRECT = "direct"        # 1:1 conversation between two agents
    GROUP_DM = "group_dm"    # Private group conversation
    BROADCAST = "broadcast"  # One-way announcements (only admins can post)


@dataclass
class ChannelMember:
    """Represents an agent's membership in a channel."""
    
    agent_id: str
    joined_at: datetime = field(default_factory=datetime.utcnow)
    role: str = "member"  # "admin", "member", "guest"
    
    # Reading state
    last_read_message_id: Optional[str] = None
    last_read_at: Optional[datetime] = None
    
    # Notification preferences
    notifications: str = "all"  # "all", "mentions", "none"


@dataclass
class Channel:
    """
    A channel for agent communication.
    
    Key concepts:
    - Channels have a name (unique within workspace) and purpose
    - Agents must join channels to participate
    - Messages are ordered by timestamp
    - Channels can be public, private, or DMs
    
    Design decisions:
    - Channels don't store messages directly; workspace manages storage
    - Channel membership is tracked for access control
    - Pinned/bookmarked items are stored on the channel
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Identity
    name: str = ""                       # Channel name (e.g., "code-reviews")
    purpose: str = ""                    # What this channel is for
    topic: str = ""                      # Current topic (can change)
    
    # Type and visibility
    channel_type: ChannelType = ChannelType.PUBLIC
    
    # Membership
    members: dict[str, ChannelMember] = field(default_factory=dict)
    
    # Content organization
    pinned_message_ids: list[str] = field(default_factory=list)
    bookmarks: list[dict] = field(default_factory=list)  # {title, url, emoji}
    
    # Workspace
    workspace_id: Optional[str] = None
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity_at: Optional[datetime] = None
    
    # Message storage (in-memory for simplicity)
    _messages: list[Message] = field(default_factory=list, repr=False)
    
    def __post_init__(self):
        """Ensure name is valid."""
        if not self.name:
            self.name = f"channel-{self.id[:8]}"
        # Normalize channel name (lowercase, no spaces)
        self.name = self.name.lower().replace(" ", "-")
    
    @property
    def member_count(self) -> int:
        """Number of members in channel."""
        return len(self.members)
    
    @property
    def is_dm(self) -> bool:
        """Check if this is a direct message channel."""
        return self.channel_type in (ChannelType.DIRECT, ChannelType.GROUP_DM)
    
    def add_member(
        self, 
        agent_id: str, 
        role: str = "member",
        notifications: str = "all"
    ) -> ChannelMember:
        """Add an agent to the channel."""
        member = ChannelMember(
            agent_id=agent_id,
            role=role,
            notifications=notifications,
        )
        self.members[agent_id] = member
        return member
    
    def remove_member(self, agent_id: str) -> bool:
        """Remove an agent from the channel."""
        if agent_id in self.members:
            del self.members[agent_id]
            return True
        return False
    
    def is_member(self, agent_id: str) -> bool:
        """Check if an agent is a member."""
        return agent_id in self.members
    
    def get_member(self, agent_id: str) -> Optional[ChannelMember]:
        """Get membership info for an agent."""
        return self.members.get(agent_id)
    
    def post_message(self, message: Message) -> Message:
        """
        Add a message to the channel.
        
        Updates the message's channel_id and tracks activity.
        """
        message.channel_id = self.id
        self._messages.append(message)
        self.last_activity_at = message.created_at
        return message
    
    def get_messages(
        self,
        limit: int = 100,
        before: Optional[datetime] = None,
        after: Optional[datetime] = None,
    ) -> list[Message]:
        """
        Get messages from the channel.
        
        Returns messages in chronological order.
        """
        messages = self._messages
        
        if after:
            messages = [m for m in messages if m.created_at > after]
        if before:
            messages = [m for m in messages if m.created_at < before]
        
        # Sort chronologically and limit
        messages = sorted(messages, key=lambda m: m.created_at)
        return messages[-limit:]
    
    def get_message(self, message_id: str) -> Optional[Message]:
        """Get a specific message by ID."""
        for msg in self._messages:
            if msg.id == message_id:
                return msg
        return None
    
    def pin_message(self, message_id: str) -> bool:
        """Pin a message to the channel."""
        if message_id not in self.pinned_message_ids:
            self.pinned_message_ids.append(message_id)
            return True
        return False
    
    def unpin_message(self, message_id: str) -> bool:
        """Unpin a message."""
        if message_id in self.pinned_message_ids:
            self.pinned_message_ids.remove(message_id)
            return True
        return False
    
    def add_bookmark(self, title: str, url: str, emoji: str = "🔗") -> dict:
        """Add a bookmark to the channel."""
        bookmark = {"title": title, "url": url, "emoji": emoji}
        self.bookmarks.append(bookmark)
        return bookmark
    
    def set_topic(self, topic: str) -> "Channel":
        """Update the channel topic."""
        self.topic = topic
        return self
    
    def mark_read(self, agent_id: str, message_id: str) -> bool:
        """Mark messages as read up to a certain message."""
        member = self.members.get(agent_id)
        if member:
            member.last_read_message_id = message_id
            member.last_read_at = datetime.utcnow()
            return True
        return False
    
    def get_unread_count(self, agent_id: str) -> int:
        """Get count of unread messages for an agent."""
        member = self.members.get(agent_id)
        if not member or not member.last_read_at:
            return len(self._messages)
        
        return sum(1 for m in self._messages if m.created_at > member.last_read_at)
    
    def to_dict(self) -> dict:
        """Serialize channel to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "purpose": self.purpose,
            "topic": self.topic,
            "channel_type": self.channel_type.value,
            "member_count": self.member_count,
            "member_ids": list(self.members.keys()),
            "pinned_count": len(self.pinned_message_ids),
            "bookmarks": self.bookmarks,
            "workspace_id": self.workspace_id,
            "created_at": self.created_at.isoformat(),
            "last_activity_at": self.last_activity_at.isoformat() if self.last_activity_at else None,
        }
    
    def __str__(self) -> str:
        """Human-readable representation."""
        type_prefix = {
            ChannelType.PUBLIC: "#",
            ChannelType.PRIVATE: "🔒",
            ChannelType.DIRECT: "💬",
            ChannelType.GROUP_DM: "👥",
            ChannelType.BROADCAST: "📢",
        }
        prefix = type_prefix.get(self.channel_type, "#")
        return f"{prefix}{self.name} ({self.member_count} members)"


def create_dm_channel(agent1_id: str, agent2_id: str) -> Channel:
    """Create a direct message channel between two agents."""
    channel = Channel(
        name=f"dm-{agent1_id[:8]}-{agent2_id[:8]}",
        channel_type=ChannelType.DIRECT,
        purpose="Direct message",
    )
    channel.add_member(agent1_id)
    channel.add_member(agent2_id)
    return channel


def create_group_dm(agent_ids: list[str], name: Optional[str] = None) -> Channel:
    """Create a group DM channel."""
    if not name:
        name = f"group-{'-'.join(a[:4] for a in agent_ids[:3])}"
    
    channel = Channel(
        name=name,
        channel_type=ChannelType.GROUP_DM,
        purpose="Group conversation",
    )
    
    for agent_id in agent_ids:
        channel.add_member(agent_id)
    
    return channel
