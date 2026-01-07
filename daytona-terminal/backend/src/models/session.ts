import { z } from 'zod';

export const SessionStatus = z.enum([
  'connecting',
  'connected',
  'disconnected',
  'error',
]);

export type SessionStatus = z.infer<typeof SessionStatus>;

export const TerminalSessionCreateSchema = z.object({
  workspaceId: z.string().uuid(),
  shell: z.string().optional(),
  cols: z.number().min(10).max(500).optional(),
  rows: z.number().min(5).max(200).optional(),
  workingDirectory: z.string().optional(),
  envVars: z.record(z.string()).default({}),
});

export type TerminalSessionCreate = z.infer<typeof TerminalSessionCreateSchema>;

export const TerminalResizeSchema = z.object({
  cols: z.number().min(10).max(500),
  rows: z.number().min(5).max(200),
});

export type TerminalResize = z.infer<typeof TerminalResizeSchema>;

export interface TerminalSession {
  id: string;
  workspaceId: string;
  status: SessionStatus;

  // Terminal settings
  shell: string;
  cols: number;
  rows: number;
  workingDirectory?: string;

  // Connection info
  websocketUrl?: string;

  // Session metadata
  createdAt: Date;
  lastActivityAt: Date;

  // AI context
  aiContextEnabled: boolean;
  aiConversationId?: string;
}

export interface TerminalInput {
  data: string;
}

export interface TerminalOutput {
  data: string;
  timestamp: Date;
}
