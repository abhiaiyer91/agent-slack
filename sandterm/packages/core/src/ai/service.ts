/**
 * AI Service - Multi-model AI support for sandterm
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ai');

const SYSTEM_PROMPT = `You are an expert AI assistant integrated into a terminal application called sandterm.

You help developers with:
- Writing, debugging, and explaining code
- Running and understanding shell commands
- Fixing errors and issues
- Git operations and workflows

IMPORTANT:
1. Be concise but helpful
2. When suggesting commands, wrap them in \`\`\`bash code blocks
3. Always explain what commands will do
4. If you detect an error, provide a specific fix
5. Consider the terminal context provided

Format commands like this:
\`\`\`bash
command here
\`\`\``;

export interface AIServiceConfig {
  provider: 'anthropic' | 'openai';
  apiKey?: string;
  model?: string;
}

export class AIService {
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private provider: 'anthropic' | 'openai';
  private model: string;

  constructor(config: AIServiceConfig) {
    this.provider = config.provider;
    
    if (config.provider === 'anthropic' && config.apiKey) {
      this.anthropic = new Anthropic({ apiKey: config.apiKey });
      this.model = config.model || 'claude-sonnet-4-20250514';
    } else if (config.provider === 'openai' && config.apiKey) {
      this.openai = new OpenAI({ apiKey: config.apiKey });
      this.model = config.model || 'gpt-4o';
    } else {
      this.model = '';
    }
  }

  isConfigured(): boolean {
    return this.anthropic !== null || this.openai !== null;
  }

  async chat(prompt: string, context?: string): Promise<{
    message: string;
    commands: string[];
  }> {
    let content = prompt;
    if (context) {
      content = `Terminal context:\n\`\`\`\n${context.slice(-3000)}\n\`\`\`\n\nUser: ${prompt}`;
    }

    const response = await this.complete(content);
    const commands = this.extractCommands(response);

    return { message: response, commands };
  }

  async quickFix(command: string, output: string): Promise<{
    message: string;
    commands: string[];
  } | null> {
    try {
      const prompt = `A command failed. Provide a brief fix (2 sentences max).

Command: ${command}
Output: ${output.slice(-1500)}

If there's a fix command, include it in a bash code block.`;

      const response = await this.complete(prompt, 256);
      const commands = this.extractCommands(response);

      return { message: response, commands };
    } catch (error) {
      logger.debug({ error }, 'Quick fix failed');
      return null;
    }
  }

  async complete(prompt: string, maxTokens = 1024): Promise<string> {
    if (this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      return '';
    }

    if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      });

      return response.choices[0]?.message?.content || '';
    }

    throw new Error('No AI provider configured');
  }

  private extractCommands(text: string): string[] {
    const commands: string[] = [];
    const regex = /```(?:bash|sh|shell|zsh)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const code = match[1].trim();
      for (const line of code.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          commands.push(trimmed);
        }
      }
    }

    return commands;
  }
}
