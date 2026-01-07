"""
Artifact Primitive

Artifacts are files, outputs, or structured data that agents share.
Unlike simple attachments, artifacts are first-class objects with
metadata, versioning, and semantic meaning.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any, Union
from enum import Enum
import uuid
import hashlib
import json


class ArtifactType(Enum):
    """Types of artifacts agents can share."""
    
    # Text content
    TEXT = "text"                    # Plain text
    MARKDOWN = "markdown"            # Markdown document
    CODE = "code"                    # Source code
    JSON = "json"                    # JSON data
    
    # Files
    FILE = "file"                    # Generic file
    IMAGE = "image"                  # Image file
    PDF = "pdf"                      # PDF document
    
    # Structured outputs
    REPORT = "report"                # Structured report
    TABLE = "table"                  # Tabular data
    CHART = "chart"                  # Visualization
    DIFF = "diff"                    # Code diff/patch
    
    # Agent-specific
    LOG = "log"                      # Execution log
    TRACE = "trace"                  # Execution trace
    RESULT = "result"                # Task result


@dataclass
class ArtifactMetadata:
    """Metadata about an artifact."""
    
    # Source information
    created_by: str = ""             # Agent ID
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    # Content information
    mime_type: str = "text/plain"
    size_bytes: int = 0
    checksum: str = ""               # SHA256 hash
    
    # Organization
    title: str = ""
    description: str = ""
    tags: list[str] = field(default_factory=list)
    
    # Versioning
    version: int = 1
    parent_id: Optional[str] = None  # Previous version
    
    # Code-specific
    language: Optional[str] = None   # Programming language
    filename: Optional[str] = None   # Original filename


@dataclass
class Artifact:
    """
    A shareable artifact between agents.
    
    Key concepts:
    - Artifacts are immutable once created (new versions for updates)
    - Content can be inline or referenced
    - Artifacts can be attached to messages
    - Artifacts have semantic types (not just file extensions)
    
    Design decisions:
    - Small artifacts store content inline
    - Large artifacts store a reference (URL, path, etc.)
    - Artifacts track lineage (which agent created, version history)
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Type and content
    artifact_type: ArtifactType = ArtifactType.TEXT
    content: Optional[str] = None    # Inline content (for small artifacts)
    reference: Optional[str] = None  # External reference (for large artifacts)
    
    # Metadata
    metadata: ArtifactMetadata = field(default_factory=ArtifactMetadata)
    
    # Workspace context
    workspace_id: Optional[str] = None
    
    def __post_init__(self):
        """Compute metadata after initialization."""
        if self.content:
            self.metadata.size_bytes = len(self.content.encode('utf-8'))
            self.metadata.checksum = hashlib.sha256(
                self.content.encode('utf-8')
            ).hexdigest()[:16]
    
    @property
    def is_inline(self) -> bool:
        """Check if content is stored inline."""
        return self.content is not None
    
    @property
    def is_reference(self) -> bool:
        """Check if content is stored externally."""
        return self.reference is not None
    
    @property
    def title(self) -> str:
        """Get the artifact title."""
        return self.metadata.title or f"Artifact {self.id[:8]}"
    
    @classmethod
    def from_code(
        cls,
        code: str,
        language: str,
        title: str = "",
        created_by: str = "",
        filename: Optional[str] = None,
    ) -> "Artifact":
        """Create an artifact from source code."""
        return cls(
            artifact_type=ArtifactType.CODE,
            content=code,
            metadata=ArtifactMetadata(
                title=title or f"{language} code",
                language=language,
                filename=filename,
                created_by=created_by,
                mime_type=f"text/x-{language}",
            ),
        )
    
    @classmethod
    def from_json(
        cls,
        data: Union[dict, list],
        title: str = "",
        created_by: str = "",
    ) -> "Artifact":
        """Create an artifact from JSON data."""
        content = json.dumps(data, indent=2)
        return cls(
            artifact_type=ArtifactType.JSON,
            content=content,
            metadata=ArtifactMetadata(
                title=title or "JSON data",
                created_by=created_by,
                mime_type="application/json",
            ),
        )
    
    @classmethod
    def from_markdown(
        cls,
        content: str,
        title: str = "",
        created_by: str = "",
    ) -> "Artifact":
        """Create an artifact from markdown content."""
        return cls(
            artifact_type=ArtifactType.MARKDOWN,
            content=content,
            metadata=ArtifactMetadata(
                title=title or "Document",
                created_by=created_by,
                mime_type="text/markdown",
            ),
        )
    
    @classmethod
    def from_report(
        cls,
        title: str,
        sections: dict[str, str],
        created_by: str = "",
    ) -> "Artifact":
        """Create a structured report artifact."""
        # Format as markdown
        content_parts = [f"# {title}\n"]
        for section_title, section_content in sections.items():
            content_parts.append(f"## {section_title}\n\n{section_content}\n")
        
        return cls(
            artifact_type=ArtifactType.REPORT,
            content="\n".join(content_parts),
            metadata=ArtifactMetadata(
                title=title,
                created_by=created_by,
                mime_type="text/markdown",
            ),
        )
    
    @classmethod
    def from_diff(
        cls,
        diff_content: str,
        title: str = "",
        created_by: str = "",
    ) -> "Artifact":
        """Create a diff/patch artifact."""
        return cls(
            artifact_type=ArtifactType.DIFF,
            content=diff_content,
            metadata=ArtifactMetadata(
                title=title or "Code Changes",
                created_by=created_by,
                mime_type="text/x-diff",
            ),
        )
    
    @classmethod
    def from_log(
        cls,
        log_content: str,
        title: str = "",
        created_by: str = "",
    ) -> "Artifact":
        """Create a log artifact."""
        return cls(
            artifact_type=ArtifactType.LOG,
            content=log_content,
            metadata=ArtifactMetadata(
                title=title or "Execution Log",
                created_by=created_by,
                mime_type="text/plain",
            ),
        )
    
    def create_new_version(
        self,
        new_content: str,
        updated_by: str,
    ) -> "Artifact":
        """Create a new version of this artifact."""
        new_artifact = Artifact(
            artifact_type=self.artifact_type,
            content=new_content,
            metadata=ArtifactMetadata(
                title=self.metadata.title,
                description=self.metadata.description,
                tags=self.metadata.tags.copy(),
                language=self.metadata.language,
                filename=self.metadata.filename,
                created_by=updated_by,
                version=self.metadata.version + 1,
                parent_id=self.id,
            ),
        )
        return new_artifact
    
    def get_content(self) -> Optional[str]:
        """Get the artifact content (inline or fetched)."""
        if self.content:
            return self.content
        # In a real implementation, would fetch from reference
        return None
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "id": self.id,
            "type": self.artifact_type.value,
            "is_inline": self.is_inline,
            "reference": self.reference,
            "metadata": {
                "title": self.metadata.title,
                "description": self.metadata.description,
                "created_by": self.metadata.created_by,
                "created_at": self.metadata.created_at.isoformat(),
                "size_bytes": self.metadata.size_bytes,
                "checksum": self.metadata.checksum,
                "mime_type": self.metadata.mime_type,
                "language": self.metadata.language,
                "filename": self.metadata.filename,
                "version": self.metadata.version,
                "parent_id": self.metadata.parent_id,
                "tags": self.metadata.tags,
            },
        }
    
    def __str__(self) -> str:
        size = f"{self.metadata.size_bytes:,}B" if self.metadata.size_bytes else "?"
        return f"📎 {self.title} ({self.artifact_type.value}, {size})"


class ArtifactStore:
    """
    Storage for artifacts in a workspace.
    
    Manages artifact lifecycle, versioning, and retrieval.
    """
    
    def __init__(self):
        self._artifacts: dict[str, Artifact] = {}
        self._by_type: dict[ArtifactType, list[str]] = {}
        self._by_creator: dict[str, list[str]] = {}
    
    def store(self, artifact: Artifact) -> Artifact:
        """Store an artifact."""
        self._artifacts[artifact.id] = artifact
        
        # Index by type
        if artifact.artifact_type not in self._by_type:
            self._by_type[artifact.artifact_type] = []
        self._by_type[artifact.artifact_type].append(artifact.id)
        
        # Index by creator
        creator = artifact.metadata.created_by
        if creator:
            if creator not in self._by_creator:
                self._by_creator[creator] = []
            self._by_creator[creator].append(artifact.id)
        
        return artifact
    
    def get(self, artifact_id: str) -> Optional[Artifact]:
        """Get an artifact by ID."""
        return self._artifacts.get(artifact_id)
    
    def get_by_type(self, artifact_type: ArtifactType) -> list[Artifact]:
        """Get all artifacts of a specific type."""
        ids = self._by_type.get(artifact_type, [])
        return [self._artifacts[id] for id in ids if id in self._artifacts]
    
    def get_by_creator(self, agent_id: str) -> list[Artifact]:
        """Get all artifacts created by a specific agent."""
        ids = self._by_creator.get(agent_id, [])
        return [self._artifacts[id] for id in ids if id in self._artifacts]
    
    def get_versions(self, artifact_id: str) -> list[Artifact]:
        """Get all versions of an artifact (including the original)."""
        versions = []
        current = self.get(artifact_id)
        
        if not current:
            return []
        
        # Walk back through parent chain
        seen = set()
        while current and current.id not in seen:
            versions.append(current)
            seen.add(current.id)
            if current.metadata.parent_id:
                current = self.get(current.metadata.parent_id)
            else:
                break
        
        # Reverse to get oldest first
        return list(reversed(versions))
    
    def search(
        self,
        query: str,
        artifact_type: Optional[ArtifactType] = None,
        creator: Optional[str] = None,
    ) -> list[Artifact]:
        """Search artifacts by content or metadata."""
        results = []
        query_lower = query.lower()
        
        for artifact in self._artifacts.values():
            # Filter by type
            if artifact_type and artifact.artifact_type != artifact_type:
                continue
            
            # Filter by creator
            if creator and artifact.metadata.created_by != creator:
                continue
            
            # Search in title and content
            if query_lower in artifact.metadata.title.lower():
                results.append(artifact)
            elif artifact.content and query_lower in artifact.content.lower():
                results.append(artifact)
            elif query_lower in " ".join(artifact.metadata.tags).lower():
                results.append(artifact)
        
        return results
    
    def list_all(self, limit: int = 100) -> list[Artifact]:
        """List all artifacts."""
        artifacts = list(self._artifacts.values())
        artifacts.sort(key=lambda a: a.metadata.created_at, reverse=True)
        return artifacts[:limit]
