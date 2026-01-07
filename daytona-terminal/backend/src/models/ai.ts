import { z } from 'zod';

export const AIAssistantType = z.enum(['claude', 'openai', 'custom']);
export type AIAssistantType = z.infer<typeof AIAssistantType>;

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;

  // Tool/function call related
  toolCalls?: Array<Record<string, unknown>>;
  toolCallId?: string;

  // Terminal context
  terminalContext?: string;
  workingDirectory?: string;

  // Metadata
  tokensUsed?: number;
  model?: string;
}

export interface AIConversation {
  id: string;
  sessionId: string;
  assistantType: AIAssistantType;

  messages: AIMessage[];

  // Conversation settings
  model: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;

  // Context
  repositoryContext?: string;
  fileContext: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  totalTokensUsed: number;
}

export interface AIAssistant {
  type: AIAssistantType;
  name: string;
  description: string;
  model: string;
  installed: boolean;
  installationCommand?: string;

  // Capabilities
  canExecuteCommands: boolean;
  canReadFiles: boolean;
  canWriteFiles: boolean;
  canSearchCodebase: boolean;

  // Configuration
  apiKeyEnvVar: string;
  config: Record<string, unknown>;
}

export const AICommandRequestSchema = z.object({
  prompt: z.string().min(1),
  includeTerminalContext: z.boolean().default(true),
  includeFileContext: z.boolean().default(false),
  files: z.array(z.string()).default([]),
  autoExecute: z.boolean().default(false),
});

export type AICommandRequest = z.infer<typeof AICommandRequestSchema>;

export interface AICommandResponse {
  message: string;
  suggestedCommands: string[];
  codeBlocks: Array<{ language: string; content: string }>;
  requiresConfirmation: boolean;
  conversationId: string;
}
