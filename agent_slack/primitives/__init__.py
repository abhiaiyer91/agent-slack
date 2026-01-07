"""Core primitives for agent communication."""

from .workspace import Workspace
from .channel import Channel, ChannelType
from .message import Message, MessageType
from .thread import Thread
from .agent import Agent, AgentStatus
from .reaction import Reaction, SEMANTIC_REACTIONS
from .mention import Mention, parse_mentions
from .presence import Presence, PresenceStatus
from .artifact import Artifact, ArtifactType

__all__ = [
    "Workspace",
    "Channel",
    "ChannelType",
    "Message", 
    "MessageType",
    "Thread",
    "Agent",
    "AgentStatus",
    "Reaction",
    "SEMANTIC_REACTIONS",
    "Mention",
    "parse_mentions",
    "Presence",
    "PresenceStatus",
    "Artifact",
    "ArtifactType",
]
