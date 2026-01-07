import { z } from 'zod';

export const WorkspaceStatus = z.enum([
  'pending',
  'creating',
  'starting',
  'running',
  'stopping',
  'stopped',
  'error',
  'deleted',
]);

export type WorkspaceStatus = z.infer<typeof WorkspaceStatus>;

export const WorkspaceCreateSchema = z.object({
  name: z.string().min(1).max(100),
  repositoryUrl: z.string().url().optional(),
  branch: z.string().optional(),
  image: z.string().optional(),
  envVars: z.record(z.string()).default({}),
  dotfilesUrl: z.string().url().optional(),
  aiAssistant: z.enum(['claude', 'openai']).optional(),
});

export type WorkspaceCreate = z.infer<typeof WorkspaceCreateSchema>;

export const WorkspaceUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  envVars: z.record(z.string()).optional(),
});

export type WorkspaceUpdate = z.infer<typeof WorkspaceUpdateSchema>;

export interface Workspace {
  id: string;
  name: string;
  status: WorkspaceStatus;
  repositoryUrl?: string;
  branch?: string;
  image: string;

  // Connection details
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  ideUrl?: string;

  // Resource info
  cpuCores?: number;
  memoryGb?: number;
  diskGb?: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  ownerId?: string;

  // AI Assistant
  aiAssistant?: string;
  aiAssistantInstalled: boolean;

  // Additional data
  metadata: Record<string, unknown>;
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
  total: number;
  page: number;
  perPage: number;
}
