/**
 * Core types for sandterm
 */

// ============================================================================
// Sandbox Types
// ============================================================================

export type SandboxStatus =
  | 'pending'
  | 'creating'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error'
  | 'deleted';

export interface Sandbox {
  id: string;
  name: string;
  status: SandboxStatus;
  
  // Optional provider-specific connection info
  host?: string;
  port?: number;
  user?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface SandboxCreateOptions {
  name: string;
  template?: string;
  image?: string;
  env?: Record<string, string>;
  timeout?: number;
  
  // Provider-specific options
  [key: string]: unknown;
}

// ============================================================================
// Terminal Session Types
// ============================================================================

export type SessionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TerminalSession {
  id: string;
  sandboxId: string;
  status: SessionStatus;
  shell: string;
  cols: number;
  rows: number;
  cwd?: string;
  createdAt: Date;
}

export interface TerminalSessionOptions {
  shell?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: Record<string, string>;
}

// ============================================================================
// Command Block Types
// ============================================================================

export interface CommandBlock {
  id: string;
  command: string;
  output: string;
  exitCode: number | null;
  startTime: Date;
  endTime: Date | null;
  cwd: string;
  analysis?: CommandAnalysis;
}

export interface CommandAnalysis {
  hasError: boolean;
  errorType?: 'syntax' | 'runtime' | 'permission' | 'not_found' | 'network' | 'dependency' | 'unknown';
  errorMessage?: string;
  suggestion?: string;
  confidence: number;
}

// ============================================================================
// AI Types
// ============================================================================

export type AIProvider = 'anthropic' | 'openai' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  message: string;
  suggestedCommands: string[];
  codeBlocks: Array<{ language: string; content: string }>;
}

// ============================================================================
// Event Types
// ============================================================================

export type SandtermEvent =
  | { type: 'output'; data: string }
  | { type: 'block'; block: CommandBlock }
  | { type: 'suggestion'; suggestion: { text: string; commands: string[] } }
  | { type: 'error'; message: string }
  | { type: 'connected'; sessionId: string }
  | { type: 'disconnected' };

export type SandtermEventHandler = (event: SandtermEvent) => void;
