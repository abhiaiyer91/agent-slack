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
  repository_url?: string;
  branch?: string;
  image: string;
  ssh_host?: string;
  ssh_port?: number;
  ssh_user?: string;
  ide_url?: string;
  cpu_cores?: number;
  memory_gb?: number;
  disk_gb?: number;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  ai_assistant?: string;
  ai_assistant_installed: boolean;
  metadata: Record<string, unknown>;
}

export interface WorkspaceCreate {
  name: string;
  repository_url?: string;
  branch?: string;
  image?: string;
  env_vars?: Record<string, string>;
  dotfiles_url?: string;
  ai_assistant?: string;
}

// Session types
export type SessionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TerminalSession {
  id: string;
  workspace_id: string;
  status: SessionStatus;
  shell: string;
  cols: number;
  rows: number;
  working_directory?: string;
  websocket_url?: string;
  created_at: string;
  last_activity_at: string;
  ai_context_enabled: boolean;
  ai_conversation_id?: string;
}

export interface TerminalSessionCreate {
  workspace_id: string;
  shell?: string;
  cols?: number;
  rows?: number;
  working_directory?: string;
  env_vars?: Record<string, string>;
}

// AI types
export type AIAssistantType = 'claude' | 'openai' | 'custom';

export interface AIAssistant {
  type: AIAssistantType;
  name: string;
  description: string;
  model: string;
  installed: boolean;
  installation_command?: string;
  api_key_env_var: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  terminal_context?: string;
}

export interface AIConversation {
  id: string;
  session_id: string;
  assistant_type: AIAssistantType;
  messages: AIMessage[];
  model: string;
  created_at: string;
  updated_at: string;
}

export interface AICommandRequest {
  prompt: string;
  include_terminal_context?: boolean;
  include_file_context?: boolean;
  files?: string[];
  auto_execute?: boolean;
}

export interface AICommandResponse {
  message: string;
  suggested_commands: string[];
  code_blocks: Array<{ language: string; content: string }>;
  requires_confirmation: boolean;
  conversation_id: string;
}

// WebSocket message types
export type WSMessageType = 'input' | 'output' | 'resize' | 'ping' | 'pong' | 'connected' | 'disconnected' | 'error';

export interface WSMessage {
  type: WSMessageType;
  data?: string;
  cols?: number;
  rows?: number;
  message?: string;
  session_id?: string;
}
