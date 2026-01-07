// Workspace types
export type WorkspaceStatus =
  | 'pending'
  | 'creating'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error'
  | 'deleted';

export interface Workspace {
  id: string;
  name: string;
  status: WorkspaceStatus;
  repositoryUrl?: string;
  branch?: string;
  image: string;
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  ideUrl?: string;
  cpuCores?: number;
  memoryGb?: number;
  diskGb?: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  aiAssistant?: string;
  aiAssistantInstalled: boolean;
  metadata: Record<string, unknown>;
}

export interface WorkspaceCreate {
  name: string;
  repositoryUrl?: string;
  branch?: string;
  image?: string;
  envVars?: Record<string, string>;
  dotfilesUrl?: string;
  aiAssistant?: string;
}

// Session types
export type SessionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TerminalSession {
  id: string;
  workspaceId: string;
  status: SessionStatus;
  shell: string;
  cols: number;
  rows: number;
  workingDirectory?: string;
  websocketUrl?: string;
  createdAt: string;
  lastActivityAt: string;
  aiContextEnabled: boolean;
  aiConversationId?: string;
}

export interface TerminalSessionCreate {
  workspaceId: string;
  shell?: string;
  cols?: number;
  rows?: number;
  workingDirectory?: string;
  envVars?: Record<string, string>;
}

// Command Block types
export interface CommandBlock {
  id: string;
  command: string;
  output: string;
  exitCode: number | null;
  startTime: string;
  endTime: string | null;
  cwd: string;
  analysis?: {
    hasError: boolean;
    errorType?: string;
    suggestion?: string;
  };
}

// AI types
export type AIAssistantType = 'claude' | 'openai' | 'custom';

export interface AIAssistant {
  type: AIAssistantType;
  name: string;
  description: string;
  model: string;
  installed: boolean;
  installationCommand?: string;
  apiKeyEnvVar: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  terminalContext?: string;
}

export interface AIConversation {
  id: string;
  sessionId: string;
  assistantType: AIAssistantType;
  messages: AIMessage[];
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface AICommandRequest {
  prompt: string;
  includeTerminalContext?: boolean;
  includeFileContext?: boolean;
  files?: string[];
  autoExecute?: boolean;
}

export interface AICommandResponse {
  message: string;
  suggestedCommands: string[];
  codeBlocks: Array<{ language: string; content: string }>;
  requiresConfirmation: boolean;
  conversationId: string;
}

export interface AISuggestion {
  text: string;
  commands: string[];
}

// WebSocket message types
export type WSMessageType = 
  | 'input' 
  | 'output' 
  | 'resize' 
  | 'ping' 
  | 'pong' 
  | 'connected' 
  | 'disconnected' 
  | 'error' 
  | 'block' 
  | 'suggestion'
  | 'completions'
  | 'analyze'
  | 'complete';

export interface WSMessage {
  type: WSMessageType;
  data?: string;
  cols?: number;
  rows?: number;
  message?: string;
  sessionId?: string;
  block?: CommandBlock;
  suggestion?: AISuggestion;
  completions?: string[];
}
