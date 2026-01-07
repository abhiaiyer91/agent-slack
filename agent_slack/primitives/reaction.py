"""
Reaction Primitive

Reactions are quick, non-verbal responses to messages. For agents,
reactions are semantic signals - not just "I like this" but specific
meanings like "acknowledged", "working on it", "done", "error".
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum


# Semantic reactions with specific meanings for agent communication
SEMANTIC_REACTIONS = {
    # Acknowledgment
    "eyes": "👀",           # Looking at it / reviewing
    "thumbsup": "👍",       # Acknowledged / approved
    "thumbsdown": "👎",     # Rejected / disapproved
    "ok_hand": "👌",        # Perfect / exactly right
    
    # Status
    "hourglass": "⏳",      # Working on it / in progress
    "white_check_mark": "✅", # Completed / done
    "x": "❌",              # Failed / cancelled
    "warning": "⚠️",        # Warning / needs attention
    "rotating_light": "🚨", # Critical / urgent
    
    # Workflow
    "arrow_right": "➡️",    # Passed to next step
    "repeat": "🔄",         # Needs retry / redo
    "question": "❓",       # Needs clarification
    "bulb": "💡",           # Insight / idea
    
    # Priority
    "fire": "🔥",           # High priority / hot
    "ice": "🧊",            # Low priority / cool down
    "star": "⭐",           # Important / featured
    
    # Sentiment
    "heart": "❤️",          # Great work / appreciation
    "tada": "🎉",           # Celebration / success
    "thinking": "🤔",       # Considering / uncertain
    "rocket": "🚀",         # Ship it / deploy
}


class ReactionType(Enum):
    """Categories of reactions."""
    
    ACKNOWLEDGMENT = "acknowledgment"
    STATUS = "status"
    WORKFLOW = "workflow"
    PRIORITY = "priority"
    SENTIMENT = "sentiment"
    CUSTOM = "custom"


@dataclass
class Reaction:
    """
    A reaction to a message.
    
    Key concepts:
    - Reactions are atomic (one agent, one emoji per message)
    - Same emoji from multiple agents stacks
    - Reactions are reversible (can be removed)
    - Semantic reactions have specific meanings
    
    Design decisions:
    - Reactions use short codes (like Slack), not raw emoji
    - Each reaction tracks who added it
    - Timestamps enable "who reacted first" ordering
    """
    
    emoji: str                          # Short code (e.g., "thumbsup")
    agent_id: str                       # Who reacted
    message_id: str                     # What they reacted to
    
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    @property
    def display_emoji(self) -> str:
        """Get the actual emoji character."""
        return SEMANTIC_REACTIONS.get(self.emoji, self.emoji)
    
    @property
    def is_semantic(self) -> bool:
        """Check if this is a semantic reaction with defined meaning."""
        return self.emoji in SEMANTIC_REACTIONS
    
    def to_dict(self) -> dict:
        """Serialize reaction to dictionary."""
        return {
            "emoji": self.emoji,
            "display": self.display_emoji,
            "agent_id": self.agent_id,
            "message_id": self.message_id,
            "created_at": self.created_at.isoformat(),
            "is_semantic": self.is_semantic,
        }
    
    def __str__(self) -> str:
        return f"{self.display_emoji} by {self.agent_id[:8]}"


@dataclass
class ReactionSummary:
    """Summary of all reactions on a message."""
    
    message_id: str
    reactions: dict[str, list[str]] = field(default_factory=dict)  # emoji -> [agent_ids]
    
    @property
    def total_count(self) -> int:
        """Total number of reactions."""
        return sum(len(agents) for agents in self.reactions.values())
    
    @property
    def unique_emojis(self) -> list[str]:
        """List of unique emoji codes used."""
        return list(self.reactions.keys())
    
    def add_reaction(self, emoji: str, agent_id: str) -> bool:
        """
        Add a reaction.
        
        Returns False if agent already reacted with this emoji.
        """
        if emoji not in self.reactions:
            self.reactions[emoji] = []
        
        if agent_id in self.reactions[emoji]:
            return False
        
        self.reactions[emoji].append(agent_id)
        return True
    
    def remove_reaction(self, emoji: str, agent_id: str) -> bool:
        """
        Remove a reaction.
        
        Returns False if reaction didn't exist.
        """
        if emoji not in self.reactions:
            return False
        
        if agent_id not in self.reactions[emoji]:
            return False
        
        self.reactions[emoji].remove(agent_id)
        
        # Clean up empty emoji entries
        if not self.reactions[emoji]:
            del self.reactions[emoji]
        
        return True
    
    def has_reaction(self, emoji: str, agent_id: Optional[str] = None) -> bool:
        """Check if a reaction exists (optionally by specific agent)."""
        if emoji not in self.reactions:
            return False
        
        if agent_id:
            return agent_id in self.reactions[emoji]
        
        return len(self.reactions[emoji]) > 0
    
    def get_agents_for_emoji(self, emoji: str) -> list[str]:
        """Get all agents who reacted with a specific emoji."""
        return self.reactions.get(emoji, [])
    
    def get_count(self, emoji: str) -> int:
        """Get count of reactions for a specific emoji."""
        return len(self.reactions.get(emoji, []))
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "message_id": self.message_id,
            "total_count": self.total_count,
            "reactions": {
                emoji: {
                    "display": SEMANTIC_REACTIONS.get(emoji, emoji),
                    "count": len(agents),
                    "agents": agents,
                }
                for emoji, agents in self.reactions.items()
            },
        }
    
    def __str__(self) -> str:
        parts = []
        for emoji, agents in self.reactions.items():
            display = SEMANTIC_REACTIONS.get(emoji, emoji)
            parts.append(f"{display} {len(agents)}")
        return " ".join(parts) if parts else "(no reactions)"


class ReactionManager:
    """
    Manages reactions across messages.
    
    Typically owned by a Channel or Workspace.
    """
    
    def __init__(self):
        self._reactions: dict[str, ReactionSummary] = {}  # message_id -> summary
        self._history: list[Reaction] = []  # All reactions for audit
    
    def add_reaction(
        self,
        message_id: str,
        emoji: str,
        agent_id: str,
    ) -> Reaction:
        """Add a reaction to a message."""
        # Get or create summary
        if message_id not in self._reactions:
            self._reactions[message_id] = ReactionSummary(message_id=message_id)
        
        summary = self._reactions[message_id]
        
        # Add reaction
        if summary.add_reaction(emoji, agent_id):
            reaction = Reaction(
                emoji=emoji,
                agent_id=agent_id,
                message_id=message_id,
            )
            self._history.append(reaction)
            return reaction
        
        # Already reacted with this emoji
        return Reaction(emoji=emoji, agent_id=agent_id, message_id=message_id)
    
    def remove_reaction(
        self,
        message_id: str,
        emoji: str,
        agent_id: str,
    ) -> bool:
        """Remove a reaction from a message."""
        if message_id not in self._reactions:
            return False
        
        return self._reactions[message_id].remove_reaction(emoji, agent_id)
    
    def get_reactions(self, message_id: str) -> ReactionSummary:
        """Get all reactions for a message."""
        return self._reactions.get(
            message_id,
            ReactionSummary(message_id=message_id)
        )
    
    def get_messages_with_reaction(self, emoji: str) -> list[str]:
        """Get all message IDs that have a specific reaction."""
        return [
            msg_id
            for msg_id, summary in self._reactions.items()
            if summary.has_reaction(emoji)
        ]
    
    def get_agent_reactions(self, agent_id: str) -> list[Reaction]:
        """Get all reactions by a specific agent."""
        return [r for r in self._history if r.agent_id == agent_id]


# Helper functions for semantic reactions
def acknowledge(message_id: str, agent_id: str) -> Reaction:
    """Create an acknowledgment reaction (👀)."""
    return Reaction(emoji="eyes", agent_id=agent_id, message_id=message_id)


def approve(message_id: str, agent_id: str) -> Reaction:
    """Create an approval reaction (👍)."""
    return Reaction(emoji="thumbsup", agent_id=agent_id, message_id=message_id)


def complete(message_id: str, agent_id: str) -> Reaction:
    """Create a completion reaction (✅)."""
    return Reaction(emoji="white_check_mark", agent_id=agent_id, message_id=message_id)


def working_on(message_id: str, agent_id: str) -> Reaction:
    """Create a working-on-it reaction (⏳)."""
    return Reaction(emoji="hourglass", agent_id=agent_id, message_id=message_id)


def alert(message_id: str, agent_id: str) -> Reaction:
    """Create an alert reaction (🚨)."""
    return Reaction(emoji="rotating_light", agent_id=agent_id, message_id=message_id)
