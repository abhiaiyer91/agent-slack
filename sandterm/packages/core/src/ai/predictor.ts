/**
 * Command Predictor - AI-powered command prediction
 * 
 * This is what makes us better than Warp. We predict FULL commands
 * before you even finish typing, using context from:
 * - Your command history
 * - Current directory
 * - Git status
 * - Package.json scripts
 * - Recent errors
 */

import type { AIService } from './service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('predictor');

export interface PredictionContext {
  // What user is typing
  partial: string;
  
  // Environment context
  cwd: string;
  recentCommands: string[];
  recentOutput: string;
  gitBranch?: string;
  gitStatus?: string;
  packageScripts?: Record<string, string>;
  
  // Error context
  lastError?: string;
}

export interface Prediction {
  command: string;
  confidence: number;
  explanation: string;
  category: 'history' | 'git' | 'npm' | 'fix' | 'ai';
}

// Common command patterns for instant predictions (no AI needed)
const COMMAND_PATTERNS: Array<{
  match: RegExp;
  predict: (match: RegExpMatchArray, ctx: PredictionContext) => Prediction[];
}> = [
  // Git shortcuts
  {
    match: /^g(i)?$/,
    predict: (_, ctx) => [
      { command: 'git status', confidence: 0.9, explanation: 'Check git status', category: 'git' },
      { command: 'git diff', confidence: 0.7, explanation: 'View changes', category: 'git' },
      { command: 'git add .', confidence: 0.6, explanation: 'Stage all changes', category: 'git' },
    ],
  },
  {
    match: /^git\s*$/,
    predict: () => [
      { command: 'git status', confidence: 0.9, explanation: 'Check status', category: 'git' },
      { command: 'git pull', confidence: 0.7, explanation: 'Pull latest', category: 'git' },
      { command: 'git push', confidence: 0.6, explanation: 'Push commits', category: 'git' },
    ],
  },
  {
    match: /^git a$/,
    predict: () => [
      { command: 'git add .', confidence: 0.95, explanation: 'Stage all files', category: 'git' },
      { command: 'git add -p', confidence: 0.7, explanation: 'Stage interactively', category: 'git' },
    ],
  },
  {
    match: /^git c$/,
    predict: () => [
      { command: 'git commit -m ""', confidence: 0.9, explanation: 'Commit with message', category: 'git' },
      { command: 'git checkout', confidence: 0.7, explanation: 'Switch branch', category: 'git' },
    ],
  },
  {
    match: /^git p$/,
    predict: (_, ctx) => [
      { command: 'git push', confidence: 0.8, explanation: 'Push to remote', category: 'git' },
      { command: 'git pull', confidence: 0.8, explanation: 'Pull from remote', category: 'git' },
      { command: ctx.gitBranch ? `git push -u origin ${ctx.gitBranch}` : 'git push -u origin main', confidence: 0.6, explanation: 'Push and set upstream', category: 'git' },
    ],
  },
  
  // NPM/Yarn/PNPM shortcuts
  {
    match: /^n(p)?$/,
    predict: (_, ctx) => {
      const predictions: Prediction[] = [];
      if (ctx.packageScripts?.dev) {
        predictions.push({ command: 'npm run dev', confidence: 0.9, explanation: 'Start dev server', category: 'npm' });
      }
      if (ctx.packageScripts?.build) {
        predictions.push({ command: 'npm run build', confidence: 0.8, explanation: 'Build project', category: 'npm' });
      }
      predictions.push({ command: 'npm install', confidence: 0.7, explanation: 'Install dependencies', category: 'npm' });
      return predictions;
    },
  },
  {
    match: /^npm r$/,
    predict: (_, ctx) => {
      const predictions: Prediction[] = [];
      if (ctx.packageScripts) {
        Object.keys(ctx.packageScripts).slice(0, 5).forEach((script, i) => {
          predictions.push({
            command: `npm run ${script}`,
            confidence: 0.9 - i * 0.1,
            explanation: ctx.packageScripts![script] || `Run ${script}`,
            category: 'npm',
          });
        });
      }
      return predictions;
    },
  },
  {
    match: /^pnpm?\s*$/,
    predict: (_, ctx) => {
      const predictions: Prediction[] = [];
      if (ctx.packageScripts?.dev) {
        predictions.push({ command: 'pnpm dev', confidence: 0.9, explanation: 'Start dev server', category: 'npm' });
      }
      predictions.push({ command: 'pnpm install', confidence: 0.7, explanation: 'Install dependencies', category: 'npm' });
      predictions.push({ command: 'pnpm build', confidence: 0.6, explanation: 'Build project', category: 'npm' });
      return predictions;
    },
  },

  // Directory navigation
  {
    match: /^c$/,
    predict: () => [
      { command: 'cd ', confidence: 0.9, explanation: 'Change directory', category: 'history' },
      { command: 'cd ..', confidence: 0.7, explanation: 'Go up one level', category: 'history' },
      { command: 'clear', confidence: 0.5, explanation: 'Clear screen', category: 'history' },
    ],
  },
  {
    match: /^cd\s*$/,
    predict: () => [
      { command: 'cd ..', confidence: 0.8, explanation: 'Go up', category: 'history' },
      { command: 'cd ~', confidence: 0.6, explanation: 'Go home', category: 'history' },
      { command: 'cd -', confidence: 0.5, explanation: 'Go to previous', category: 'history' },
    ],
  },

  // List files
  {
    match: /^l$/,
    predict: () => [
      { command: 'ls -la', confidence: 0.9, explanation: 'List all files', category: 'history' },
      { command: 'ls', confidence: 0.7, explanation: 'List files', category: 'history' },
    ],
  },

  // Docker
  {
    match: /^d(o)?$/,
    predict: () => [
      { command: 'docker ps', confidence: 0.8, explanation: 'List containers', category: 'history' },
      { command: 'docker compose up -d', confidence: 0.7, explanation: 'Start services', category: 'history' },
    ],
  },

  // Kubernetes
  {
    match: /^k$/,
    predict: () => [
      { command: 'kubectl get pods', confidence: 0.9, explanation: 'List pods', category: 'history' },
      { command: 'kubectl get svc', confidence: 0.7, explanation: 'List services', category: 'history' },
    ],
  },
];

// Error fix patterns
const ERROR_FIXES: Array<{
  pattern: RegExp;
  fix: (match: RegExpMatchArray, ctx: PredictionContext) => Prediction;
}> = [
  {
    pattern: /command not found: (\w+)/,
    fix: (match) => ({
      command: `which ${match[1]} || brew install ${match[1]}`,
      confidence: 0.8,
      explanation: `Install missing command: ${match[1]}`,
      category: 'fix',
    }),
  },
  {
    pattern: /ENOENT.*package\.json/,
    fix: () => ({
      command: 'npm init -y',
      confidence: 0.9,
      explanation: 'Initialize package.json',
      category: 'fix',
    }),
  },
  {
    pattern: /Cannot find module/,
    fix: () => ({
      command: 'npm install',
      confidence: 0.9,
      explanation: 'Install missing dependencies',
      category: 'fix',
    }),
  },
  {
    pattern: /EACCES|permission denied/i,
    fix: (_, ctx) => ({
      command: `sudo ${ctx.recentCommands[0] || ''}`.trim(),
      confidence: 0.8,
      explanation: 'Run with sudo',
      category: 'fix',
    }),
  },
  {
    pattern: /error: Your local changes.*would be overwritten/,
    fix: () => ({
      command: 'git stash && git pull && git stash pop',
      confidence: 0.85,
      explanation: 'Stash, pull, and restore changes',
      category: 'fix',
    }),
  },
  {
    pattern: /error: failed to push some refs/,
    fix: () => ({
      command: 'git pull --rebase && git push',
      confidence: 0.9,
      explanation: 'Rebase and push',
      category: 'fix',
    }),
  },
  {
    pattern: /EADDRINUSE.*:(\d+)/,
    fix: (match) => ({
      command: `lsof -ti:${match[1]} | xargs kill -9`,
      confidence: 0.85,
      explanation: `Kill process on port ${match[1]}`,
      category: 'fix',
    }),
  },
];

export class CommandPredictor {
  constructor(private ai: AIService) {}

  /**
   * Get predictions for partial command input
   */
  async predict(ctx: PredictionContext): Promise<Prediction[]> {
    const predictions: Prediction[] = [];
    
    // 1. Pattern-based predictions (instant)
    for (const { match, predict } of COMMAND_PATTERNS) {
      const m = ctx.partial.match(match);
      if (m) {
        predictions.push(...predict(m, ctx));
      }
    }

    // 2. Error-based fixes
    if (ctx.lastError) {
      for (const { pattern, fix } of ERROR_FIXES) {
        const m = ctx.lastError.match(pattern);
        if (m) {
          predictions.unshift(fix(m, ctx)); // Priority for fixes
        }
      }
    }

    // 3. History-based predictions
    if (ctx.partial.length >= 2) {
      const historyMatches = ctx.recentCommands
        .filter(cmd => cmd.startsWith(ctx.partial))
        .slice(0, 3)
        .map((cmd, i) => ({
          command: cmd,
          confidence: 0.8 - i * 0.1,
          explanation: 'From history',
          category: 'history' as const,
        }));
      predictions.push(...historyMatches);
    }

    // 4. AI predictions for complex cases (if enabled and no good matches)
    if (predictions.length < 2 && ctx.partial.length >= 3 && this.ai.isConfigured()) {
      try {
        const aiPredictions = await this.getAIPredictions(ctx);
        predictions.push(...aiPredictions);
      } catch (error) {
        logger.debug({ error }, 'AI prediction failed');
      }
    }

    // Deduplicate and sort by confidence
    const seen = new Set<string>();
    return predictions
      .filter(p => {
        if (seen.has(p.command)) return false;
        seen.add(p.command);
        return true;
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private async getAIPredictions(ctx: PredictionContext): Promise<Prediction[]> {
    const prompt = `You are a terminal command predictor. Given the partial input and context, predict what command the user wants.

Partial input: "${ctx.partial}"
Current directory: ${ctx.cwd}
Recent commands: ${ctx.recentCommands.slice(0, 5).join(', ')}
${ctx.gitBranch ? `Git branch: ${ctx.gitBranch}` : ''}
${ctx.lastError ? `Last error: ${ctx.lastError.slice(0, 200)}` : ''}

Return 1-3 most likely commands as JSON array:
[{"command": "...", "explanation": "..."}]

Only return the JSON, nothing else.`;

    const response = await this.ai.complete(prompt, 256);
    
    try {
      const parsed = JSON.parse(response) as Array<{ command: string; explanation: string }>;
      return parsed.map((p, i) => ({
        command: p.command,
        confidence: 0.7 - i * 0.1,
        explanation: p.explanation,
        category: 'ai' as const,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get fix suggestions for an error
   */
  async suggestFix(command: string, error: string): Promise<Prediction | null> {
    // Check pattern-based fixes first
    for (const { pattern, fix } of ERROR_FIXES) {
      const m = error.match(pattern);
      if (m) {
        return fix(m, { partial: '', cwd: '', recentCommands: [command], recentOutput: error });
      }
    }

    // Use AI for complex errors
    if (this.ai.isConfigured()) {
      const result = await this.ai.quickFix(command, error);
      if (result && result.commands.length > 0) {
        return {
          command: result.commands[0],
          confidence: 0.8,
          explanation: result.message,
          category: 'ai',
        };
      }
    }

    return null;
  }
}
