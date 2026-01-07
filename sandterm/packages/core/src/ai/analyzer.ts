/**
 * Command Analyzer - Detects errors and provides suggestions
 */

import type { CommandAnalysis } from '../types/index.js';
import type { AIService } from './service.js';

// Common error patterns
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  type: CommandAnalysis['errorType'];
  suggestion: string;
}> = [
  { pattern: /command not found/i, type: 'not_found', suggestion: 'Check if the command is installed' },
  { pattern: /permission denied/i, type: 'permission', suggestion: 'Try with sudo or check permissions' },
  { pattern: /No such file or directory/i, type: 'not_found', suggestion: 'Verify the path exists' },
  { pattern: /syntax error/i, type: 'syntax', suggestion: 'Check command syntax' },
  { pattern: /connection refused|ECONNREFUSED/i, type: 'network', suggestion: 'Check if the service is running' },
  { pattern: /ENOENT/i, type: 'not_found', suggestion: 'File or directory not found' },
  { pattern: /npm ERR!|yarn error/i, type: 'dependency', suggestion: 'Try deleting node_modules and reinstalling' },
  { pattern: /ModuleNotFoundError|ImportError/i, type: 'dependency', suggestion: 'Install the missing package' },
  { pattern: /Error:|ERROR:|error:/i, type: 'runtime', suggestion: 'Check the error message' },
  { pattern: /fatal:/i, type: 'runtime', suggestion: 'A fatal error occurred' },
  { pattern: /Traceback/i, type: 'runtime', suggestion: 'Python exception - check stack trace' },
];

const SUCCESS_PATTERNS = [
  /Successfully|success|completed|done/i,
  /✓|✔/,
  /\[OK\]|\[PASS\]/i,
  /built in \d+/i,
];

export class CommandAnalyzer {
  constructor(private ai: AIService) {}

  async analyze(command: string, output: string): Promise<CommandAnalysis> {
    // Quick pattern-based check
    const basic = this.patternAnalysis(output);
    
    // If error and AI available, get better suggestion
    if (basic.hasError && this.ai.isConfigured()) {
      try {
        const fix = await this.ai.quickFix(command, output);
        if (fix) {
          basic.suggestion = fix.message;
          basic.confidence = 0.9;
        }
      } catch {
        // Use basic suggestion
      }
    }

    return basic;
  }

  private patternAnalysis(output: string): CommandAnalysis {
    // Check success patterns first
    for (const pattern of SUCCESS_PATTERNS) {
      if (pattern.test(output)) {
        return { hasError: false, confidence: 0.8 };
      }
    }

    // Check error patterns
    for (const { pattern, type, suggestion } of ERROR_PATTERNS) {
      if (pattern.test(output)) {
        return {
          hasError: true,
          errorType: type,
          suggestion,
          confidence: 0.7,
        };
      }
    }

    return { hasError: false, confidence: 0.5 };
  }
}
