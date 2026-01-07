"""
Agent Slack: Communication Primitives for Agent Workspaces

A framework for enabling Slack-like collaboration between AI agents.
"""

from .primitives.workspace import Workspace
from .primitives.channel import Channel, ChannelType
from .primitives.message import Message, MessageType
from .primitives.thread import Thread
from .primitives.agent import Agent, AgentStatus
from .primitives.reaction import Reaction, SEMANTIC_REACTIONS
from .primitives.mention import Mention, parse_mentions
from .primitives.presence import Presence, PresenceStatus
from .primitives.artifact import Artifact, ArtifactType

from .coordination.task import Task, TaskStatus
from .coordination.handoff import Handoff, HandoffReason
from .coordination.workflow import Workflow, WorkflowStep

__version__ = "0.1.0"

__all__ = [
    # Core primitives
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
    # Coordination
    "Task",
    "TaskStatus",
    "Handoff",
    "HandoffReason",
    "Workflow",
    "WorkflowStep",
]
