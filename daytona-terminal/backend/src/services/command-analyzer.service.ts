import { createLogger } from '../utils/logger.js';
import { config_ } from '../utils/config.js';

const logger = createLogger('command-analyzer');

interface CommandAnalysis {
  hasError: boolean;
  errorType?: 'syntax' | 'runtime' | 'permission' | 'not_found' | 'network' | 'dependency' | 'unknown';
  errorMessage?: string;
  suggestion?: string;
  confidence: number;
}

// Common error patterns
const ERROR_PATTERNS = [
  { pattern: /command not found/i, type: 'not_found' as const, suggestion: 'Check if the command is installed or the path is correct' },
  { pattern: /permission denied/i, type: 'permission' as const, suggestion: 'Try running with sudo or check file permissions' },
  { pattern: /No such file or directory/i, type: 'not_found' as const, suggestion: 'Verify the file/directory path exists' },
  { pattern: /syntax error/i, type: 'syntax' as const, suggestion: 'Check the command syntax' },
  { pattern: /connection refused|ECONNREFUSED/i, type: 'network' as const, suggestion: 'Check if the service is running and the port is correct' },
  { pattern: /ENOENT/i, type: 'not_found' as const, suggestion: 'File or directory not found' },
  { pattern: /npm ERR!|yarn error/i, type: 'dependency' as const, suggestion: 'Try deleting node_modules and running install again' },
  { pattern: /ModuleNotFoundError|ImportError/i, type: 'dependency' as const, suggestion: 'Install the missing Python package' },
  { pattern: /error\[E\d+\]:/i, type: 'syntax' as const, suggestion: 'Rust compiler error - check the indicated line' },
  { pattern: /error: cannot find/i, type: 'not_found' as const, suggestion: 'Check if the module/crate is in your dependencies' },
  { pattern: /fatal:/i, type: 'runtime' as const, suggestion: 'A fatal error occurred' },
  { pattern: /Error:|ERROR:|error:/i, type: 'runtime' as const, suggestion: 'Check the error message for details' },
  { pattern: /panic:/i, type: 'runtime' as const, suggestion: 'Program panicked - check stack trace' },
  { pattern: /Traceback \(most recent call last\)/i, type: 'runtime' as const, suggestion: 'Python exception - check the stack trace' },
  { pattern: /Exception in thread/i, type: 'runtime' as const, suggestion: 'Java/JVM exception occurred' },
  { pattern: /SIGTERM|SIGKILL|SIGSEGV/i, type: 'runtime' as const, suggestion: 'Process was terminated or crashed' },
  { pattern: /out of memory|OOM/i, type: 'runtime' as const, suggestion: 'Process ran out of memory' },
  { pattern: /exit code [1-9]|exit status [1-9]|exited with code [1-9]/i, type: 'runtime' as const, suggestion: 'Command exited with non-zero status' },
];

// Success patterns
const SUCCESS_PATTERNS = [
  /Successfully|success|completed|done/i,
  /✓|✔|√/,
  /\[OK\]|\[PASS\]|\[SUCCESS\]/i,
  /built in \d+/i,
  /compiled successfully/i,
];

export class CommandAnalyzerService {
  /**
   * Analyze command output for errors and provide suggestions
   */
  async analyzeOutput(command: string, output: string): Promise<CommandAnalysis> {
    // Quick pattern-based analysis
    const analysis = this.patternAnalysis(output);

    // If we found an error and AI is available, get better suggestions
    if (analysis.hasError && config_.ai.isConfigured && config_.features.autoFix) {
      try {
        const aiSuggestion = await this.getAISuggestion(command, output, analysis);
        if (aiSuggestion) {
          analysis.suggestion = aiSuggestion;
          analysis.confidence = 0.9;
        }
      } catch (error) {
        logger.debug({ error }, 'Failed to get AI suggestion');
      }
    }

    return analysis;
  }

  private patternAnalysis(output: string): CommandAnalysis {
    // Check for success patterns first
    for (const pattern of SUCCESS_PATTERNS) {
      if (pattern.test(output)) {
        return { hasError: false, confidence: 0.8 };
      }
    }

    // Check for error patterns
    for (const { pattern, type, suggestion } of ERROR_PATTERNS) {
      const match = output.match(pattern);
      if (match) {
        // Extract the error message context
        const lines = output.split('\n');
        const errorLineIndex = lines.findIndex(line => pattern.test(line));
        const errorMessage = errorLineIndex >= 0 
          ? lines.slice(Math.max(0, errorLineIndex - 1), errorLineIndex + 3).join('\n')
          : match[0];

        return {
          hasError: true,
          errorType: type,
          errorMessage: errorMessage.slice(0, 500),
          suggestion,
          confidence: 0.7,
        };
      }
    }

    // No patterns matched
    return { hasError: false, confidence: 0.5 };
  }

  private async getAISuggestion(
    command: string,
    output: string,
    analysis: CommandAnalysis
  ): Promise<string | null> {
    // Use Claude for suggestions
    if (config_.ai.hasAnthropic) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: config_.ai.anthropicKey });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `A command failed. Provide a brief, actionable fix suggestion (1-2 sentences max).

Command: ${command}
Error type: ${analysis.errorType}
Output (last 1000 chars): ${output.slice(-1000)}

Reply with ONLY the fix suggestion, nothing else.`,
        }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }
    }

    // Fallback to OpenAI
    if (config_.ai.hasOpenAI) {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: config_.ai.openaiKey });

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `A command failed. Provide a brief, actionable fix suggestion (1-2 sentences max).

Command: ${command}
Error type: ${analysis.errorType}
Output (last 1000 chars): ${output.slice(-1000)}

Reply with ONLY the fix suggestion, nothing else.`,
        }],
      });

      return response.choices[0]?.message?.content?.trim() || null;
    }

    return null;
  }

  /**
   * Get predictive command suggestions based on context
   */
  async getPredictions(
    currentInput: string,
    context: { cwd: string; history: string[]; recentOutput: string }
  ): Promise<string[]> {
    if (!config_.features.predictiveCommands || !config_.ai.isConfigured) {
      return this.getBasicPredictions(currentInput, context);
    }

    try {
      return await this.getAIPredictions(currentInput, context);
    } catch (error) {
      logger.debug({ error }, 'Failed to get AI predictions');
      return this.getBasicPredictions(currentInput, context);
    }
  }

  private getBasicPredictions(
    currentInput: string,
    context: { history: string[] }
  ): string[] {
    if (!currentInput.trim()) return [];

    // Filter history for matching commands
    return context.history
      .filter(cmd => cmd.startsWith(currentInput) && cmd !== currentInput)
      .slice(0, 5);
  }

  private async getAIPredictions(
    currentInput: string,
    context: { cwd: string; history: string[]; recentOutput: string }
  ): Promise<string[]> {
    if (config_.ai.hasAnthropic) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: config_.ai.anthropicKey });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Predict the next 3 most likely commands the user wants to type.

Current directory: ${context.cwd}
Current input: "${currentInput}"
Recent commands: ${context.history.slice(-5).join(', ')}
Recent output (last 500 chars): ${context.recentOutput.slice(-500)}

Return ONLY a JSON array of 3 command strings, nothing else. Example: ["git status", "npm install", "ls -la"]`,
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

    return [];
  }
}

export const commandAnalyzer = new CommandAnalyzerService();
