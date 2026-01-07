/**
 * Voice Commands - Speak to your terminal
 * 
 * Uses Web Speech API on the frontend or Whisper API on the backend.
 * This is how we destroy Warp - they don't have this.
 */

import type { AIService } from '../ai/service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('voice');

export interface VoiceCommand {
  transcript: string;
  command: string;
  confidence: number;
  action: 'execute' | 'type' | 'explain' | 'cancel';
}

// Natural language to command mappings
const VOICE_PATTERNS: Array<{
  patterns: RegExp[];
  action: VoiceCommand['action'];
  transform: (match: RegExpMatchArray, transcript: string) => string;
}> = [
  // Direct commands
  {
    patterns: [/^run (.+)$/i, /^execute (.+)$/i, /^do (.+)$/i],
    action: 'execute',
    transform: (match) => match[1],
  },
  
  // Git commands
  {
    patterns: [/^commit( with message)? (.+)$/i],
    action: 'execute',
    transform: (match) => `git commit -m "${match[2]}"`,
  },
  {
    patterns: [/^push( to)?( \w+)?$/i],
    action: 'execute',
    transform: (match) => match[2] ? `git push origin ${match[2].trim()}` : 'git push',
  },
  {
    patterns: [/^pull( from)?( \w+)?$/i],
    action: 'execute',
    transform: () => 'git pull',
  },
  {
    patterns: [/^(git )?status$/i, /^show status$/i, /^what's the status$/i],
    action: 'execute',
    transform: () => 'git status',
  },
  {
    patterns: [/^stage (all|everything)$/i, /^add (all|everything)$/i],
    action: 'execute',
    transform: () => 'git add .',
  },
  {
    patterns: [/^(create|make|new) branch (.+)$/i],
    action: 'execute',
    transform: (match) => `git checkout -b ${match[2].replace(/\s+/g, '-')}`,
  },
  {
    patterns: [/^switch to( branch)? (.+)$/i, /^checkout (.+)$/i],
    action: 'execute',
    transform: (match) => `git checkout ${match[2] || match[1]}`,
  },

  // File operations
  {
    patterns: [/^list files$/i, /^show files$/i, /^what's here$/i],
    action: 'execute',
    transform: () => 'ls -la',
  },
  {
    patterns: [/^go to (.+)$/i, /^change directory to (.+)$/i, /^cd (.+)$/i],
    action: 'execute',
    transform: (match) => `cd ${match[1]}`,
  },
  {
    patterns: [/^go up$/i, /^go back$/i, /^parent directory$/i],
    action: 'execute',
    transform: () => 'cd ..',
  },
  {
    patterns: [/^(create|make|new) (file|directory|folder) (.+)$/i],
    action: 'execute',
    transform: (match) => match[2] === 'file' ? `touch ${match[3]}` : `mkdir -p ${match[3]}`,
  },
  {
    patterns: [/^(delete|remove) (.+)$/i],
    action: 'type', // Type but don't execute for safety
    transform: (match) => `rm -rf ${match[2]}`,
  },

  // NPM/Package commands
  {
    patterns: [/^install( dependencies)?$/i, /^npm install$/i],
    action: 'execute',
    transform: () => 'npm install',
  },
  {
    patterns: [/^install (.+)$/i, /^add package (.+)$/i],
    action: 'execute',
    transform: (match) => `npm install ${match[1]}`,
  },
  {
    patterns: [/^(run|start) (dev|development|server)$/i],
    action: 'execute',
    transform: () => 'npm run dev',
  },
  {
    patterns: [/^(run )?build$/i],
    action: 'execute',
    transform: () => 'npm run build',
  },
  {
    patterns: [/^run tests?$/i, /^test$/i],
    action: 'execute',
    transform: () => 'npm test',
  },

  // Docker
  {
    patterns: [/^(show |list )?containers$/i],
    action: 'execute',
    transform: () => 'docker ps',
  },
  {
    patterns: [/^start (docker|containers)$/i],
    action: 'execute',
    transform: () => 'docker compose up -d',
  },
  {
    patterns: [/^stop (docker|containers)$/i],
    action: 'execute',
    transform: () => 'docker compose down',
  },

  // Terminal control
  {
    patterns: [/^clear( screen)?$/i, /^clean( up)?$/i],
    action: 'execute',
    transform: () => 'clear',
  },
  {
    patterns: [/^stop$/i, /^cancel$/i, /^abort$/i, /^kill( it)?$/i],
    action: 'cancel',
    transform: () => '\x03', // Ctrl+C
  },

  // Explanations
  {
    patterns: [/^(explain|what does) (.+)( do| mean)?$/i, /^help with (.+)$/i],
    action: 'explain',
    transform: (match) => match[2] || match[1],
  },
];

export class VoiceCommandProcessor {
  constructor(private ai?: AIService) {}

  /**
   * Process a voice transcript into a command
   */
  async process(transcript: string): Promise<VoiceCommand> {
    const cleaned = transcript.trim().toLowerCase();
    
    // Try pattern matching first
    for (const { patterns, action, transform } of VOICE_PATTERNS) {
      for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
          return {
            transcript,
            command: transform(match, transcript),
            confidence: 0.9,
            action,
          };
        }
      }
    }

    // Fall back to AI interpretation
    if (this.ai?.isConfigured()) {
      return this.aiInterpret(transcript);
    }

    // Default: just type the transcript as-is
    return {
      transcript,
      command: cleaned,
      confidence: 0.5,
      action: 'type',
    };
  }

  private async aiInterpret(transcript: string): Promise<VoiceCommand> {
    const prompt = `Convert this voice command to a terminal command:
"${transcript}"

Return JSON: {"command": "the command", "action": "execute|type|explain", "confidence": 0.0-1.0}
- action "execute": run immediately
- action "type": type but don't run (for dangerous commands)
- action "explain": user wants an explanation

Only return valid JSON.`;

    try {
      const response = await this.ai!.complete(prompt, 128);
      const parsed = JSON.parse(response);
      return {
        transcript,
        command: parsed.command || transcript,
        confidence: parsed.confidence || 0.7,
        action: parsed.action || 'type',
      };
    } catch {
      return {
        transcript,
        command: transcript,
        confidence: 0.4,
        action: 'type',
      };
    }
  }

  /**
   * Get suggested voice commands for the current context
   */
  getSuggestions(): string[] {
    return [
      'Say "git status" to check changes',
      'Say "commit update readme" to commit',
      'Say "run dev" to start development server',
      'Say "list files" to see directory contents',
      'Say "explain git rebase" for help',
      'Say "clear" to clear the screen',
      'Say "stop" to cancel current command',
    ];
  }
}
