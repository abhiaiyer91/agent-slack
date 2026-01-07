/**
 * Artifact Primitive
 *
 * Artifacts are files, outputs, or structured data that agents share.
 * Unlike simple attachments, artifacts are first-class objects with
 * metadata, versioning, and semantic meaning.
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

/**
 * Types of artifacts agents can share.
 */
export const ArtifactType = {
  // Text content
  TEXT: 'text',
  MARKDOWN: 'markdown',
  CODE: 'code',
  JSON: 'json',

  // Files
  FILE: 'file',
  IMAGE: 'image',
  PDF: 'pdf',

  // Structured outputs
  REPORT: 'report',
  TABLE: 'table',
  DIFF: 'diff',

  // Agent-specific
  LOG: 'log',
  TRACE: 'trace',
  RESULT: 'result',
} as const;

export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

export const ArtifactMetadataSchema = z.object({
  createdBy: z.string(),
  createdAt: z.date(),
  mimeType: z.string().default('text/plain'),
  sizeBytes: z.number().default(0),
  checksum: z.string().default(''),
  title: z.string().default(''),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  version: z.number().default(1),
  parentId: z.string().optional(),
  language: z.string().optional(),
  filename: z.string().optional(),
});

export type ArtifactMetadata = z.infer<typeof ArtifactMetadataSchema>;

export const ArtifactSchema = z.object({
  id: z.string(),
  artifactType: z.enum([
    'text', 'markdown', 'code', 'json', 'file', 'image', 'pdf',
    'report', 'table', 'diff', 'log', 'trace', 'result',
  ]),
  content: z.string().optional(),
  reference: z.string().optional(),
  metadata: ArtifactMetadataSchema,
  workspaceId: z.string().optional(),
});

export type ArtifactData = z.infer<typeof ArtifactSchema>;

/**
 * Input type for creating artifacts.
 */
export interface ArtifactInput {
  id?: string;
  artifactType: ArtifactType;
  content?: string;
  reference?: string;
  workspaceId?: string;
  metadata: {
    createdBy?: string;
    createdAt?: Date;
    mimeType?: string;
    title?: string;
    description?: string;
    tags?: string[];
    version?: number;
    parentId?: string;
    language?: string;
    filename?: string;
  };
}

/**
 * A shareable artifact between agents.
 */
export class Artifact {
  readonly id: string;
  readonly artifactType: ArtifactType;
  readonly content?: string;
  readonly reference?: string;
  readonly metadata: ArtifactMetadata;
  readonly workspaceId?: string;

  constructor(data: ArtifactInput) {
    this.id = data.id ?? nanoid();
    this.artifactType = data.artifactType;
    this.content = data.content;
    this.reference = data.reference;
    this.workspaceId = data.workspaceId;

    // Build metadata
    const now = new Date();
    this.metadata = {
      createdBy: data.metadata.createdBy ?? '',
      createdAt: data.metadata.createdAt ?? now,
      mimeType: data.metadata.mimeType ?? 'text/plain',
      sizeBytes: 0,
      checksum: '',
      title: data.metadata.title ?? '',
      description: data.metadata.description ?? '',
      tags: data.metadata.tags ?? [],
      version: data.metadata.version ?? 1,
      parentId: data.metadata.parentId,
      language: data.metadata.language,
      filename: data.metadata.filename,
    };

    // Compute size and checksum for inline content
    if (this.content) {
      const bytes = Buffer.from(this.content, 'utf-8');
      this.metadata.sizeBytes = bytes.length;
      this.metadata.checksum = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    }
  }

  get isInline(): boolean {
    return this.content !== undefined;
  }

  get isReference(): boolean {
    return this.reference !== undefined;
  }

  get title(): string {
    return this.metadata.title || `Artifact ${this.id.slice(0, 8)}`;
  }

  /**
   * Create an artifact from source code.
   */
  static fromCode(
    code: string,
    language: string,
    options: { title?: string; createdBy?: string; filename?: string } = {}
  ): Artifact {
    return new Artifact({
      artifactType: ArtifactType.CODE,
      content: code,
      metadata: {
        title: options.title ?? `${language} code`,
        language,
        filename: options.filename,
        createdBy: options.createdBy ?? '',
        mimeType: `text/x-${language}`,
      },
    });
  }

  /**
   * Create an artifact from JSON data.
   */
  static fromJSON(
    data: unknown,
    options: { title?: string; createdBy?: string } = {}
  ): Artifact {
    const content = JSON.stringify(data, null, 2);
    return new Artifact({
      artifactType: ArtifactType.JSON,
      content,
      metadata: {
        title: options.title ?? 'JSON data',
        createdBy: options.createdBy ?? '',
        mimeType: 'application/json',
      },
    });
  }

  /**
   * Create an artifact from markdown content.
   */
  static fromMarkdown(
    content: string,
    options: { title?: string; createdBy?: string } = {}
  ): Artifact {
    return new Artifact({
      artifactType: ArtifactType.MARKDOWN,
      content,
      metadata: {
        title: options.title ?? 'Document',
        createdBy: options.createdBy ?? '',
        mimeType: 'text/markdown',
      },
    });
  }

  /**
   * Create a structured report artifact.
   */
  static fromReport(
    title: string,
    sections: Record<string, string>,
    options: { createdBy?: string } = {}
  ): Artifact {
    const contentParts = [`# ${title}\n`];
    for (const [sectionTitle, sectionContent] of Object.entries(sections)) {
      contentParts.push(`## ${sectionTitle}\n\n${sectionContent}\n`);
    }

    return new Artifact({
      artifactType: ArtifactType.REPORT,
      content: contentParts.join('\n'),
      metadata: {
        title,
        createdBy: options.createdBy ?? '',
        mimeType: 'text/markdown',
      },
    });
  }

  /**
   * Create a diff/patch artifact.
   */
  static fromDiff(
    diffContent: string,
    options: { title?: string; createdBy?: string } = {}
  ): Artifact {
    return new Artifact({
      artifactType: ArtifactType.DIFF,
      content: diffContent,
      metadata: {
        title: options.title ?? 'Code Changes',
        createdBy: options.createdBy ?? '',
        mimeType: 'text/x-diff',
      },
    });
  }

  /**
   * Create a log artifact.
   */
  static fromLog(
    logContent: string,
    options: { title?: string; createdBy?: string } = {}
  ): Artifact {
    return new Artifact({
      artifactType: ArtifactType.LOG,
      content: logContent,
      metadata: {
        title: options.title ?? 'Execution Log',
        createdBy: options.createdBy ?? '',
        mimeType: 'text/plain',
      },
    });
  }

  /**
   * Create a new version of this artifact.
   */
  createNewVersion(newContent: string, updatedBy: string): Artifact {
    return new Artifact({
      artifactType: this.artifactType,
      content: newContent,
      metadata: {
        title: this.metadata.title,
        description: this.metadata.description,
        tags: [...this.metadata.tags],
        language: this.metadata.language,
        filename: this.metadata.filename,
        createdBy: updatedBy,
        mimeType: this.metadata.mimeType,
        version: this.metadata.version + 1,
        parentId: this.id,
      },
    });
  }

  /**
   * Get the artifact content (inline or fetched).
   */
  getContent(): string | undefined {
    if (this.content) {
      return this.content;
    }
    // In a real implementation, would fetch from reference
    return undefined;
  }

  toJSON(): ArtifactData {
    return {
      id: this.id,
      artifactType: this.artifactType,
      content: this.content,
      reference: this.reference,
      metadata: this.metadata,
      workspaceId: this.workspaceId,
    };
  }

  toString(): string {
    const size = this.metadata.sizeBytes
      ? `${this.metadata.sizeBytes.toLocaleString()}B`
      : '?';
    return `📎 ${this.title} (${this.artifactType}, ${size})`;
  }
}

/**
 * Storage for artifacts in a workspace.
 */
export class ArtifactStore {
  private readonly _artifacts: Map<string, Artifact> = new Map();
  private readonly _byType: Map<ArtifactType, string[]> = new Map();
  private readonly _byCreator: Map<string, string[]> = new Map();

  /**
   * Store an artifact.
   */
  store(artifact: Artifact): Artifact {
    this._artifacts.set(artifact.id, artifact);

    // Index by type
    if (!this._byType.has(artifact.artifactType)) {
      this._byType.set(artifact.artifactType, []);
    }
    this._byType.get(artifact.artifactType)!.push(artifact.id);

    // Index by creator
    const creator = artifact.metadata.createdBy;
    if (creator) {
      if (!this._byCreator.has(creator)) {
        this._byCreator.set(creator, []);
      }
      this._byCreator.get(creator)!.push(artifact.id);
    }

    return artifact;
  }

  /**
   * Get an artifact by ID.
   */
  get(artifactId: string): Artifact | undefined {
    return this._artifacts.get(artifactId);
  }

  /**
   * Get all artifacts of a specific type.
   */
  getByType(artifactType: ArtifactType): Artifact[] {
    const ids = this._byType.get(artifactType) ?? [];
    return ids.map((id) => this._artifacts.get(id)!).filter(Boolean);
  }

  /**
   * Get all artifacts created by a specific agent.
   */
  getByCreator(agentId: string): Artifact[] {
    const ids = this._byCreator.get(agentId) ?? [];
    return ids.map((id) => this._artifacts.get(id)!).filter(Boolean);
  }

  /**
   * Get all versions of an artifact (including the original).
   */
  getVersions(artifactId: string): Artifact[] {
    const versions: Artifact[] = [];
    let current = this.get(artifactId);

    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      versions.push(current);
      seen.add(current.id);
      if (current.metadata.parentId) {
        current = this.get(current.metadata.parentId);
      } else {
        break;
      }
    }

    return versions.reverse();
  }

  /**
   * Search artifacts by content or metadata.
   */
  search(
    query: string,
    options: { artifactType?: ArtifactType; creator?: string } = {}
  ): Artifact[] {
    const results: Artifact[] = [];
    const queryLower = query.toLowerCase();

    for (const artifact of this._artifacts.values()) {
      if (options.artifactType && artifact.artifactType !== options.artifactType) {
        continue;
      }
      if (options.creator && artifact.metadata.createdBy !== options.creator) {
        continue;
      }

      if (artifact.metadata.title.toLowerCase().includes(queryLower)) {
        results.push(artifact);
      } else if (artifact.content?.toLowerCase().includes(queryLower)) {
        results.push(artifact);
      } else if (artifact.metadata.tags.some((t) => t.toLowerCase().includes(queryLower))) {
        results.push(artifact);
      }
    }

    return results;
  }

  /**
   * List all artifacts.
   */
  listAll(limit = 100): Artifact[] {
    const artifacts = Array.from(this._artifacts.values());
    artifacts.sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime());
    return artifacts.slice(0, limit);
  }
}
