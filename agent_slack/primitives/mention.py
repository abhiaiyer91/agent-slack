"""
Mention Primitive

Mentions (@name) are how agents direct attention to each other.
They're parsed from message content and trigger notifications.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum
import re


class MentionType(Enum):
    """Types of mentions."""
    
    AGENT = "agent"          # @agent-name
    CHANNEL = "channel"      # #channel-name
    HERE = "here"            # @here - all online agents in channel
    CHANNEL_ALL = "channel"  # @channel - all members of channel
    EVERYONE = "everyone"    # @everyone - all agents in workspace


@dataclass
class Mention:
    """
    A mention parsed from message content.
    
    Key concepts:
    - Mentions are extracted from message text
    - They map to agent IDs for notification routing
    - Special mentions (@here, @channel, @everyone) have broader scope
    
    Design decisions:
    - Mentions use @name syntax like Slack
    - Parsed mentions include position for highlighting
    - Unresolved mentions (unknown names) are still tracked
    """
    
    raw: str                            # Original text (e.g., "@code-agent")
    mention_type: MentionType = MentionType.AGENT
    
    # For agent/channel mentions
    target_name: str = ""               # The name being mentioned
    target_id: Optional[str] = None     # Resolved ID (if found)
    
    # Position in message
    start_pos: int = 0
    end_pos: int = 0
    
    @property
    def is_resolved(self) -> bool:
        """Check if mention was resolved to an ID."""
        return self.target_id is not None
    
    @property
    def is_broadcast(self) -> bool:
        """Check if this is a broadcast mention (@here, @channel, @everyone)."""
        return self.mention_type in (
            MentionType.HERE,
            MentionType.CHANNEL_ALL,
            MentionType.EVERYONE,
        )
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "raw": self.raw,
            "type": self.mention_type.value,
            "target_name": self.target_name,
            "target_id": self.target_id,
            "is_resolved": self.is_resolved,
            "position": {"start": self.start_pos, "end": self.end_pos},
        }
    
    def __str__(self) -> str:
        resolved = f" -> {self.target_id[:8]}" if self.target_id else " (unresolved)"
        return f"{self.raw}{resolved}"


# Regex patterns for parsing mentions
AGENT_MENTION_PATTERN = re.compile(r'@([\w-]+)')
CHANNEL_MENTION_PATTERN = re.compile(r'#([\w-]+)')
BROADCAST_MENTIONS = {"here", "channel", "everyone"}


def parse_mentions(
    content: str,
    resolve_agent: Optional[callable] = None,
    resolve_channel: Optional[callable] = None,
) -> list[Mention]:
    """
    Parse all mentions from message content.
    
    Args:
        content: The message text to parse
        resolve_agent: Optional function(name) -> agent_id to resolve agent mentions
        resolve_channel: Optional function(name) -> channel_id to resolve channel mentions
    
    Returns:
        List of Mention objects found in content
    """
    mentions = []
    
    # Find @mentions
    for match in AGENT_MENTION_PATTERN.finditer(content):
        name = match.group(1).lower()
        
        # Check for broadcast mentions
        if name in BROADCAST_MENTIONS:
            mention_type = {
                "here": MentionType.HERE,
                "channel": MentionType.CHANNEL_ALL,
                "everyone": MentionType.EVERYONE,
            }[name]
            
            mentions.append(Mention(
                raw=match.group(0),
                mention_type=mention_type,
                target_name=name,
                start_pos=match.start(),
                end_pos=match.end(),
            ))
        else:
            # Regular agent mention
            target_id = None
            if resolve_agent:
                target_id = resolve_agent(name)
            
            mentions.append(Mention(
                raw=match.group(0),
                mention_type=MentionType.AGENT,
                target_name=name,
                target_id=target_id,
                start_pos=match.start(),
                end_pos=match.end(),
            ))
    
    # Find #channel mentions
    for match in CHANNEL_MENTION_PATTERN.finditer(content):
        name = match.group(1).lower()
        
        target_id = None
        if resolve_channel:
            target_id = resolve_channel(name)
        
        mentions.append(Mention(
            raw=match.group(0),
            mention_type=MentionType.CHANNEL,
            target_name=name,
            target_id=target_id,
            start_pos=match.start(),
            end_pos=match.end(),
        ))
    
    # Sort by position
    mentions.sort(key=lambda m: m.start_pos)
    
    return mentions


def get_mentioned_agent_ids(mentions: list[Mention]) -> list[str]:
    """Extract unique resolved agent IDs from mentions."""
    ids = set()
    for m in mentions:
        if m.mention_type == MentionType.AGENT and m.target_id:
            ids.add(m.target_id)
    return list(ids)


def has_broadcast_mention(mentions: list[Mention]) -> bool:
    """Check if any mention is a broadcast (@here, @channel, @everyone)."""
    return any(m.is_broadcast for m in mentions)


def format_mention(agent_id: str, agent_name: str) -> str:
    """Format a mention for display."""
    return f"@{agent_name}"


@dataclass
class MentionContext:
    """
    Context for handling mentions in a message.
    
    Used by the workspace to determine who should be notified.
    """
    
    message_id: str
    channel_id: str
    sender_id: str
    
    mentions: list[Mention] = field(default_factory=list)
    
    @property
    def mentioned_agent_ids(self) -> list[str]:
        """Get all directly mentioned agent IDs."""
        return get_mentioned_agent_ids(self.mentions)
    
    @property
    def has_here(self) -> bool:
        """Check for @here mention."""
        return any(m.mention_type == MentionType.HERE for m in self.mentions)
    
    @property
    def has_channel(self) -> bool:
        """Check for @channel mention."""
        return any(m.mention_type == MentionType.CHANNEL_ALL for m in self.mentions)
    
    @property
    def has_everyone(self) -> bool:
        """Check for @everyone mention."""
        return any(m.mention_type == MentionType.EVERYONE for m in self.mentions)
    
    def get_notification_targets(
        self,
        channel_members: list[str],
        online_members: list[str],
        all_agents: list[str],
    ) -> set[str]:
        """
        Determine who should be notified based on mentions.
        
        Args:
            channel_members: All members of the channel
            online_members: Members currently online in channel
            all_agents: All agents in workspace
        
        Returns:
            Set of agent IDs to notify
        """
        targets = set()
        
        # Add directly mentioned agents
        targets.update(self.mentioned_agent_ids)
        
        # Handle broadcast mentions
        if self.has_everyone:
            targets.update(all_agents)
        elif self.has_channel:
            targets.update(channel_members)
        elif self.has_here:
            targets.update(online_members)
        
        # Don't notify sender
        targets.discard(self.sender_id)
        
        return targets
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "message_id": self.message_id,
            "channel_id": self.channel_id,
            "sender_id": self.sender_id,
            "mentions": [m.to_dict() for m in self.mentions],
            "mentioned_agent_ids": self.mentioned_agent_ids,
            "has_broadcast": has_broadcast_mention(self.mentions),
        }
