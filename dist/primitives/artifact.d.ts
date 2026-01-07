/**
 * Artifact Primitive
 *
 * Artifacts are files, outputs, or structured data that agents share.
 * Unlike simple attachments, artifacts are first-class objects with
 * metadata, versioning, and semantic meaning.
 */
import { z } from 'zod';
/**
 * Types of artifacts agents can share.
 */
export declare const ArtifactType: {
    readonly TEXT: "text";
    readonly MARKDOWN: "markdown";
    readonly CODE: "code";
    readonly JSON: "json";
    readonly FILE: "file";
    readonly IMAGE: "image";
    readonly PDF: "pdf";
    readonly REPORT: "report";
    readonly TABLE: "table";
    readonly DIFF: "diff";
    readonly LOG: "log";
    readonly TRACE: "trace";
    readonly RESULT: "result";
};
export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];
export declare const ArtifactMetadataSchema: z.ZodObject<{
    createdBy: z.ZodString;
    createdAt: z.ZodDate;
    mimeType: z.ZodDefault<z.ZodString>;
    sizeBytes: z.ZodDefault<z.ZodNumber>;
    checksum: z.ZodDefault<z.ZodString>;
    title: z.ZodDefault<z.ZodString>;
    description: z.ZodDefault<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    version: z.ZodDefault<z.ZodNumber>;
    parentId: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    filename: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    createdAt: Date;
    createdBy: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    title: string;
    description: string;
    tags: string[];
    version: number;
    parentId?: string | undefined;
    language?: string | undefined;
    filename?: string | undefined;
}, {
    createdAt: Date;
    createdBy: string;
    mimeType?: string | undefined;
    sizeBytes?: number | undefined;
    checksum?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    version?: number | undefined;
    parentId?: string | undefined;
    language?: string | undefined;
    filename?: string | undefined;
}>;
export type ArtifactMetadata = z.infer<typeof ArtifactMetadataSchema>;
export declare const ArtifactSchema: z.ZodObject<{
    id: z.ZodString;
    artifactType: z.ZodEnum<["text", "markdown", "code", "json", "file", "image", "pdf", "report", "table", "diff", "log", "trace", "result"]>;
    content: z.ZodOptional<z.ZodString>;
    reference: z.ZodOptional<z.ZodString>;
    metadata: z.ZodObject<{
        createdBy: z.ZodString;
        createdAt: z.ZodDate;
        mimeType: z.ZodDefault<z.ZodString>;
        sizeBytes: z.ZodDefault<z.ZodNumber>;
        checksum: z.ZodDefault<z.ZodString>;
        title: z.ZodDefault<z.ZodString>;
        description: z.ZodDefault<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        version: z.ZodDefault<z.ZodNumber>;
        parentId: z.ZodOptional<z.ZodString>;
        language: z.ZodOptional<z.ZodString>;
        filename: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        createdAt: Date;
        createdBy: string;
        mimeType: string;
        sizeBytes: number;
        checksum: string;
        title: string;
        description: string;
        tags: string[];
        version: number;
        parentId?: string | undefined;
        language?: string | undefined;
        filename?: string | undefined;
    }, {
        createdAt: Date;
        createdBy: string;
        mimeType?: string | undefined;
        sizeBytes?: number | undefined;
        checksum?: string | undefined;
        title?: string | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
        version?: number | undefined;
        parentId?: string | undefined;
        language?: string | undefined;
        filename?: string | undefined;
    }>;
    workspaceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    metadata: {
        createdAt: Date;
        createdBy: string;
        mimeType: string;
        sizeBytes: number;
        checksum: string;
        title: string;
        description: string;
        tags: string[];
        version: number;
        parentId?: string | undefined;
        language?: string | undefined;
        filename?: string | undefined;
    };
    artifactType: "text" | "code" | "markdown" | "json" | "file" | "image" | "pdf" | "report" | "table" | "diff" | "log" | "trace" | "result";
    content?: string | undefined;
    workspaceId?: string | undefined;
    reference?: string | undefined;
}, {
    id: string;
    metadata: {
        createdAt: Date;
        createdBy: string;
        mimeType?: string | undefined;
        sizeBytes?: number | undefined;
        checksum?: string | undefined;
        title?: string | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
        version?: number | undefined;
        parentId?: string | undefined;
        language?: string | undefined;
        filename?: string | undefined;
    };
    artifactType: "text" | "code" | "markdown" | "json" | "file" | "image" | "pdf" | "report" | "table" | "diff" | "log" | "trace" | "result";
    content?: string | undefined;
    workspaceId?: string | undefined;
    reference?: string | undefined;
}>;
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
export declare class Artifact {
    readonly id: string;
    readonly artifactType: ArtifactType;
    readonly content?: string;
    readonly reference?: string;
    readonly metadata: ArtifactMetadata;
    readonly workspaceId?: string;
    constructor(data: ArtifactInput);
    get isInline(): boolean;
    get isReference(): boolean;
    get title(): string;
    /**
     * Create an artifact from source code.
     */
    static fromCode(code: string, language: string, options?: {
        title?: string;
        createdBy?: string;
        filename?: string;
    }): Artifact;
    /**
     * Create an artifact from JSON data.
     */
    static fromJSON(data: unknown, options?: {
        title?: string;
        createdBy?: string;
    }): Artifact;
    /**
     * Create an artifact from markdown content.
     */
    static fromMarkdown(content: string, options?: {
        title?: string;
        createdBy?: string;
    }): Artifact;
    /**
     * Create a structured report artifact.
     */
    static fromReport(title: string, sections: Record<string, string>, options?: {
        createdBy?: string;
    }): Artifact;
    /**
     * Create a diff/patch artifact.
     */
    static fromDiff(diffContent: string, options?: {
        title?: string;
        createdBy?: string;
    }): Artifact;
    /**
     * Create a log artifact.
     */
    static fromLog(logContent: string, options?: {
        title?: string;
        createdBy?: string;
    }): Artifact;
    /**
     * Create a new version of this artifact.
     */
    createNewVersion(newContent: string, updatedBy: string): Artifact;
    /**
     * Get the artifact content (inline or fetched).
     */
    getContent(): string | undefined;
    toJSON(): ArtifactData;
    toString(): string;
}
/**
 * Storage for artifacts in a workspace.
 */
export declare class ArtifactStore {
    private readonly _artifacts;
    private readonly _byType;
    private readonly _byCreator;
    /**
     * Store an artifact.
     */
    store(artifact: Artifact): Artifact;
    /**
     * Get an artifact by ID.
     */
    get(artifactId: string): Artifact | undefined;
    /**
     * Get all artifacts of a specific type.
     */
    getByType(artifactType: ArtifactType): Artifact[];
    /**
     * Get all artifacts created by a specific agent.
     */
    getByCreator(agentId: string): Artifact[];
    /**
     * Get all versions of an artifact (including the original).
     */
    getVersions(artifactId: string): Artifact[];
    /**
     * Search artifacts by content or metadata.
     */
    search(query: string, options?: {
        artifactType?: ArtifactType;
        creator?: string;
    }): Artifact[];
    /**
     * List all artifacts.
     */
    listAll(limit?: number): Artifact[];
}
//# sourceMappingURL=artifact.d.ts.map