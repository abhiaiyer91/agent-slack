import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config_ } from '../utils/config.js';
import { createLogger } from '../utils/logger.js';
import type {
  AIAssistant,
  AIConversation,
  AIMessage,
  AICommandRequest,
  AICommandResponse,
  AIAssistantType,
} from '../models/ai.js';
import { terminalService } from './terminal.service.js';

const logger = createLogger('ai');

const SYSTEM_PROMPT = `You are an expert AI coding assistant integrated into a powerful terminal application.

You help developers with:
- Writing, debugging, and explaining code
- Running and understanding shell commands
- Fixing errors and issues
- Git operations and workflows
- DevOps and infrastructure tasks

IMPORTANT GUIDELINES:
1. Be concise but thorough
2. When suggesting commands, wrap them in \`\`\`bash code blocks
3. Always explain what commands will do BEFORE suggesting them
4. If you detect an error, provide a clear fix
5. Consider the terminal context provided
6. Suggest the most efficient solution

When you see error output, immediately:
1. Identify the root cause
2. Provide a specific fix
3. Explain how to prevent it in the future

Format code blocks properly:
\`\`\`bash
command here
\`\`\`

\`\`\`python
code here
\`\`\``;

const AVAILABLE_ASSISTANTS: Record<string, AIAssistant> = {
  claude: {
    type: 'claude',
    name: 'Claude',
    description: "Anthropic's Claude - excellent at coding and reasoning",
    model: 'claude-sonnet-4-20250514',
    installed: false,
    canExecuteCommands: true,
    canReadFiles: true,
    canWriteFiles: true,
    canSearchCodebase: true,
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    config: {},
  },
  openai: {
    type: 'openai',
    name: 'GPT-4',
    description: "OpenAI's GPT-4 - versatile and capable",
    model: 'gpt-4o',
    installed: false,
    canExecuteCommands: true,
    canReadFiles: true,
    canWriteFiles: true,
    canSearchCodebase: true,
    apiKeyEnvVar: 'OPENAI_API_KEY',
    config: {},
  },
};

export class AIService {
  private conversations: Map<string, AIConversation> = new Map();
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;

  constructor() {
    if (config_.ai.anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: config_.ai.anthropicKey });
    }
    if (config_.ai.openaiKey) {
      this.openai = new OpenAI({ apiKey: config_.ai.openaiKey });
    }
  }

  listAssistants(): AIAssistant[] {
    return Object.entries(AVAILABLE_ASSISTANTS).map(([key, assistant]) => ({
      ...assistant,
      installed: key === 'claude' ? config_.ai.hasAnthropic : config_.ai.hasOpenAI,
    }));
  }

  getAssistant(type: string): AIAssistant | null {
    const assistant = AVAILABLE_ASSISTANTS[type];
    if (!assistant) return null;
    return {
      ...assistant,
      installed: type === 'claude' ? config_.ai.hasAnthropic : config_.ai.hasOpenAI,
    };
  }

  async createConversation(
    sessionId: string,
    assistantType: AIAssistantType = 'claude',
    customSystemPrompt?: string
  ): Promise<AIConversation> {
    const conversationId = uuid();

    const conversation: AIConversation = {
      id: conversationId,
      sessionId,
      assistantType,
      messages: [],
      model: assistantType === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o',
      systemPrompt: customSystemPrompt || SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 4096,
      fileContext: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      totalTokensUsed: 0,
    };

    this.conversations.set(conversationId, conversation);
    logger.info({ conversationId, sessionId, assistantType }, 'Created AI conversation');

    return conversation;
  }

  async getConversation(conversationId: string): Promise<AIConversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  async sendMessage(
    conversationId: string,
    request: AICommandRequest,
    terminalContext?: string
  ): Promise<AICommandResponse> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Build the message with context
    let content = request.prompt;
    if (request.includeTerminalContext && terminalContext) {
      content = `Terminal context (recent output):
\`\`\`
${terminalContext.slice(-5000)}
\`\`\`

User request: ${request.prompt}`;
    }

    // Add user message
    const userMessage: AIMessage = {
      id: uuid(),
      role: 'user',
      content,
      timestamp: new Date(),
      terminalContext: terminalContext?.slice(0, 1000),
    };
    conversation.messages.push(userMessage);

    // Get AI response
    let responseText: string;
    try {
      if (conversation.assistantType === 'claude') {
        responseText = await this.getClaudeResponse(conversation);
      } else {
        responseText = await this.getOpenAIResponse(conversation);
      }
    } catch (error) {
      logger.error({ error, conversationId }, 'AI request failed');
      throw new Error(`AI request failed: ${error}`);
    }

    // Parse response for commands and code blocks
    const { commands, codeBlocks } = this.parseResponse(responseText);

    // Add assistant message
    const assistantMessage: AIMessage = {
      id: uuid(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
    };
    conversation.messages.push(assistantMessage);
    conversation.updatedAt = new Date();

    return {
      message: responseText,
      suggestedCommands: commands,
      codeBlocks,
      requiresConfirmation: !request.autoExecute,
      conversationId,
    };
  }

  private async getClaudeResponse(conversation: AIConversation): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not available');
    }

    const messages = conversation.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.anthropic.messages.create({
      model: conversation.model,
      max_tokens: conversation.maxTokens,
      system: conversation.systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return content.text;
  }

  private async getOpenAIResponse(conversation: AIConversation): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not available');
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: conversation.systemPrompt || SYSTEM_PROMPT },
    ];

    for (const m of conversation.messages) {
      if (m.role === 'user' || m.role === 'assistant') {
        messages.push({ role: m.role, content: m.content });
      }
    }

    const response = await this.openai.chat.completions.create({
      model: conversation.model,
      max_tokens: conversation.maxTokens,
      messages,
    });

    return response.choices[0]?.message?.content || '';
  }

  private parseResponse(response: string): {
    commands: string[];
    codeBlocks: Array<{ language: string; content: string }>;
  } {
    const commands: string[] = [];
    const codeBlocks: Array<{ language: string; content: string }> = [];

    // Match all code blocks
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || 'text';
      const content = match[2].trim();

      codeBlocks.push({ language, content });

      // Extract commands from bash/shell blocks
      if (['bash', 'sh', 'shell', 'zsh', ''].includes(language)) {
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            commands.push(trimmed);
          }
        }
      }
    }

    return { commands, codeBlocks };
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.conversations.delete(conversationId);
  }

  async clearConversation(conversationId: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;
    conversation.messages = [];
    conversation.updatedAt = new Date();
    return true;
  }

  /**
   * Quick AI analysis for errors - used for inline suggestions
   */
  async quickAnalyze(
    sessionId: string,
    errorOutput: string
  ): Promise<{ suggestion: string; commands: string[] } | null> {
    if (!config_.ai.isConfigured) return null;

    try {
      const prompt = `Briefly analyze this error and suggest a fix (2 sentences max):

\`\`\`
${errorOutput.slice(-2000)}
\`\`\`

If there's a command to fix it, include it in a bash code block.`;

      if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0];
        if (content.type === 'text') {
          const { commands } = this.parseResponse(content.text);
          return { suggestion: content.text, commands };
        }
      }
    } catch (error) {
      logger.debug({ error }, 'Quick analyze failed');
    }

    return null;
  }

  /**
   * Get intelligent command completions
   */
  async getCompletions(
    sessionId: string,
    partial: string
  ): Promise<string[]> {
    if (!config_.ai.isConfigured || !partial.trim()) return [];

    const context = terminalService.getContext(sessionId, 2000);

    try {
      if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: `Complete this command. Return only a JSON array of 3 likely completions.
Partial command: "${partial}"
Context: ${context.slice(-500)}

Return ONLY valid JSON array, e.g.: ["completion1", "completion2", "completion3"]`,
          }],
        });

        const content = response.content[0];
        if (content.type === 'text') {
          try {
            return JSON.parse(content.text);
          } catch {
            return [];
          }
        }
      }
    } catch (error) {
      logger.debug({ error }, 'Completions failed');
    }

    return [];
  }
}

// Singleton
export const aiService = new AIService();
