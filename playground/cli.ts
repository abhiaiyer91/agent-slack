#!/usr/bin/env node
/**
 * Agent Slack Interactive Playground
 *
 * A CLI interface to watch agents collaborate and interact with them.
 */

import * as readline from 'readline';
import {
  AgentWorkspace,
  Message,
  SemanticReactions,
  PollManager,
  VoteRequirement,
} from '../src/index.js';
import { AgentRuntime } from '../src/agents/mastra-integration.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

const agentColors: Record<string, string> = {
  'code-reviewer': colors.blue,
  'security-analyst': colors.red,
  'qa-engineer': colors.green,
  'tech-writer': colors.magenta,
  'devops-engineer': colors.yellow,
  'project-lead': colors.cyan,
  'human': colors.white,
};

function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function formatMessage(message: Message, reactions?: string): string {
  const time = colorize(formatTimestamp(message.createdAt), colors.dim);
  const agentColor = agentColors[message.senderId] ?? colors.white;
  const sender = colorize(message.senderId, agentColor + colors.bold);
  const thread = message.threadId ? colorize(` [thread]`, colors.dim) : '';
  const rxns = reactions ? ` ${reactions}` : '';
  
  // Wrap long messages
  const maxWidth = 70;
  let content = message.content;
  if (content.length > maxWidth) {
    content = content.slice(0, maxWidth) + '...';
  }
  
  return `${time} ${sender}${thread}: ${content}${rxns}`;
}

class Playground {
  private workspace: AgentWorkspace;
  private runtime: AgentRuntime;
  private pollManager: PollManager;
  private rl: readline.Interface;
  private currentChannel = 'general';
  private humanId = 'human';

  constructor() {
    // Create workspace
    this.workspace = new AgentWorkspace('playground', {
      description: 'Interactive Agent Playground',
    });

    // Create poll manager
    this.pollManager = new PollManager();

    // Create runtime
    this.runtime = new AgentRuntime(this.workspace, {
      debug: false,
      autoRespond: true,
      onResponse: (agentId, response) => {
        console.log(colorize(`\n💭 ${agentId} is thinking...`, colors.dim));
      },
    });

    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Register agents
    this.setupAgents();

    // Register human
    this.workspace.registerAgent({
      id: this.humanId,
      name: 'human',
      description: 'Human operator',
      capabilities: ['oversight', 'decisions'],
    });

    // Subscribe to events
    this.setupEventHandlers();
  }

  private setupAgents(): void {
    const agents = [
      {
        id: 'code-reviewer',
        name: 'code-reviewer',
        description: 'Reviews code for quality',
        instructions: 'You review code for quality and best practices.',
        capabilities: ['code_review', 'refactoring'],
      },
      {
        id: 'security-analyst',
        name: 'security-analyst',
        description: 'Analyzes security vulnerabilities',
        instructions: 'You analyze code for security issues.',
        capabilities: ['security_review', 'vulnerability_detection'],
      },
      {
        id: 'qa-engineer',
        name: 'qa-engineer',
        description: 'Ensures quality through testing',
        instructions: 'You ensure quality through testing.',
        capabilities: ['testing', 'quality'],
      },
    ];

    for (const agent of agents) {
      this.runtime.registerAgent(agent.id, agent.name, {
        description: agent.description,
        instructions: agent.instructions,
        capabilities: agent.capabilities,
      });
      this.workspace.joinChannel(agent.id, this.workspace.getChannel('general')!.id);
    }
  }

  private setupEventHandlers(): void {
    // Message events
    this.workspace.on('message', (message) => {
      if (message.senderId !== this.humanId) {
        console.log(formatMessage(message));
      }
    });

    // Reaction events
    this.workspace.on('reaction', (messageId, emoji, agentId) => {
      const display = (SemanticReactions as Record<string, string>)[emoji] ?? emoji;
      console.log(colorize(`   ${agentId} reacted with ${display}`, colors.dim));
    });
  }

  private printHeader(): void {
    console.clear();
    console.log(colorize('╔════════════════════════════════════════════════════════════╗', colors.cyan));
    console.log(colorize('║        🤖 Agent Slack Interactive Playground 🤖             ║', colors.cyan));
    console.log(colorize('╚════════════════════════════════════════════════════════════╝', colors.cyan));
    console.log();
  }

  private printHelp(): void {
    console.log(`
${colorize('Commands:', colors.bold)}
  ${colorize('/help', colors.yellow)}              Show this help
  ${colorize('/agents', colors.yellow)}            List all agents
  ${colorize('/channels', colors.yellow)}          List all channels
  ${colorize('/join <channel>', colors.yellow)}    Switch to a channel
  ${colorize('/history', colors.yellow)}           Show recent messages
  ${colorize('/status', colors.yellow)}            Show agent status
  ${colorize('/mention <agent>', colors.yellow)}   @mention an agent
  ${colorize('/react <emoji>', colors.yellow)}     React to last message
  ${colorize('/poll <question>', colors.yellow)}   Create a poll
  ${colorize('/trigger <agent>', colors.yellow)}   Trigger agent to respond
  ${colorize('/demo', colors.yellow)}              Run a demo scenario
  ${colorize('/quit', colors.yellow)}              Exit playground

${colorize('Tips:', colors.bold)}
  - Use @agent-name in messages to mention agents
  - Agents respond automatically when mentioned
  - Watch the console for agent activity
`);
  }

  private listAgents(): void {
    console.log(colorize('\n👥 Connected Agents:\n', colors.bold));
    
    for (const agent of this.runtime.listAgents()) {
      const presence = this.workspace.presence.get(agent.id);
      const statusIcon = presence?.isAvailable ? '🟢' : '⚫';
      const color = agentColors[agent.id] ?? colors.white;
      console.log(`  ${statusIcon} ${colorize(agent.name, color)} - ${presence?.statusMessage || 'Ready'}`);
    }
    console.log();
  }

  private listChannels(): void {
    console.log(colorize('\n📺 Channels:\n', colors.bold));
    
    for (const channel of this.workspace.listChannels()) {
      const isCurrent = channel.name === this.currentChannel;
      const prefix = isCurrent ? colorize('▶ ', colors.green) : '  ';
      console.log(`${prefix}#${channel.name} (${channel.memberCount} members)`);
    }
    console.log();
  }

  private showHistory(): void {
    const channel = this.workspace.getChannel(this.currentChannel);
    if (!channel) return;

    console.log(colorize(`\n📜 Recent messages in #${this.currentChannel}:\n`, colors.bold));
    
    const messages = this.workspace.getMessages(channel.id, { limit: 10 });
    
    if (messages.length === 0) {
      console.log(colorize('  No messages yet.', colors.dim));
    } else {
      for (const message of messages) {
        const reactions = this.workspace.reactions.getReactions(message.id);
        console.log('  ' + formatMessage(message, reactions.toString()));
      }
    }
    console.log();
  }

  private showStatus(): void {
    console.log(colorize('\n📊 Workspace Status:\n', colors.bold));
    
    const agents = this.workspace.listAgents();
    const online = this.workspace.presence.getOnlineAgents().length;
    const channels = this.workspace.listChannels();
    
    console.log(`  Agents: ${online}/${agents.length} online`);
    console.log(`  Channels: ${channels.length}`);
    console.log(`  Current: #${this.currentChannel}`);
    console.log();
  }

  private async postMessage(content: string): Promise<void> {
    const channel = this.workspace.getChannel(this.currentChannel);
    if (!channel) {
      console.log(colorize('Channel not found', colors.red));
      return;
    }

    // Ensure human is in the channel
    if (!channel.isMember(this.humanId)) {
      this.workspace.joinChannel(this.humanId, channel.id);
    }

    const message = this.workspace.postMessage(this.humanId, channel.id, content);
    console.log(colorize(`You: ${content}`, colors.bold));

    // Simulate agent responses if mentioned
    const mentionedAgents = content.match(/@[\w-]+/g) ?? [];
    
    for (const mention of mentionedAgents) {
      const agentName = mention.slice(1);
      const agent = this.runtime.getAgent(agentName);
      
      if (agent) {
        // Simulate thinking
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Get response
        const response = await this.runtime.triggerAgent(agentName, content, {
          channelId: channel.id,
        });
        
        if (response) {
          // Add reaction to acknowledge
          this.workspace.addReaction(message.id, 'eyes', agentName);
        }
      }
    }
  }

  private async runDemo(): Promise<void> {
    console.log(colorize('\n🎬 Running demo scenario...\n', colors.bold));
    
    const channel = this.workspace.getChannel(this.currentChannel);
    if (!channel) return;

    // Demo: Code review request
    const steps = [
      {
        agent: this.humanId,
        content: 'Hey team! I have a new PR ready for review. It adds user authentication with JWT.',
        delay: 1000,
      },
      {
        agent: this.humanId,
        content: '@code-reviewer Can you check the code quality? @security-analyst Please review for security issues.',
        delay: 1500,
      },
      {
        agent: 'code-reviewer',
        content: '👀 Looking at the PR now. Will check for code quality and best practices.',
        delay: 1200,
      },
      {
        agent: 'security-analyst',
        content: '🔒 Starting security review. Will check for auth vulnerabilities and token handling.',
        delay: 1000,
      },
      {
        agent: 'code-reviewer',
        content: '✅ Code looks good! Clean structure, good test coverage. Minor suggestion: consider extracting the token validation logic into a separate util.',
        delay: 2000,
      },
      {
        agent: 'security-analyst',
        content: '⚠️ Found one issue: JWT secret should come from environment variables, not hardcoded. Otherwise, auth implementation looks solid.',
        delay: 1500,
      },
      {
        agent: this.humanId,
        content: 'Thanks team! I\'ll fix the JWT secret issue and extract the util. @qa-engineer - can you add some edge case tests?',
        delay: 1000,
      },
      {
        agent: 'qa-engineer',
        content: '🧪 On it! I\'ll add tests for token expiration, invalid tokens, and refresh flow.',
        delay: 1200,
      },
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
      
      // Ensure agent is in channel
      if (!channel.isMember(step.agent)) {
        this.workspace.joinChannel(step.agent, channel.id);
      }
      
      const message = this.workspace.postMessage(step.agent, channel.id, step.content);
      
      const color = agentColors[step.agent] ?? colors.white;
      console.log(`${formatTimestamp(message.createdAt)} ${colorize(step.agent, color + colors.bold)}: ${step.content}`);
    }

    console.log(colorize('\n✅ Demo complete!\n', colors.green));
  }

  private async handleCommand(input: string): Promise<boolean> {
    const [command, ...args] = input.trim().split(' ');
    const arg = args.join(' ');

    switch (command) {
      case '/help':
        this.printHelp();
        break;

      case '/agents':
        this.listAgents();
        break;

      case '/channels':
        this.listChannels();
        break;

      case '/join':
        if (arg) {
          const channel = this.workspace.getChannel(arg);
          if (channel) {
            this.currentChannel = channel.name;
            console.log(colorize(`\nSwitched to #${channel.name}`, colors.green));
          } else {
            console.log(colorize(`Channel "${arg}" not found`, colors.red));
          }
        }
        break;

      case '/history':
        this.showHistory();
        break;

      case '/status':
        this.showStatus();
        break;

      case '/trigger':
        if (arg) {
          console.log(colorize(`\nTriggering ${arg}...`, colors.dim));
          await this.runtime.triggerAgent(arg, 'Please provide an update.', {
            channelId: this.workspace.getChannel(this.currentChannel)?.id,
          });
        }
        break;

      case '/demo':
        await this.runDemo();
        break;

      case '/quit':
      case '/exit':
        console.log(colorize('\n👋 Goodbye!\n', colors.cyan));
        return false;

      default:
        console.log(colorize(`Unknown command: ${command}. Type /help for commands.`, colors.red));
    }

    return true;
  }

  async start(): Promise<void> {
    this.printHeader();
    this.printHelp();

    console.log(colorize(`Currently in #${this.currentChannel}\n`, colors.dim));

    const prompt = (): void => {
      this.rl.question(colorize(`#${this.currentChannel} > `, colors.green), async (input) => {
        if (!input.trim()) {
          prompt();
          return;
        }

        if (input.startsWith('/')) {
          const shouldContinue = await this.handleCommand(input);
          if (!shouldContinue) {
            this.rl.close();
            process.exit(0);
          }
        } else {
          await this.postMessage(input);
        }

        prompt();
      });
    };

    prompt();
  }
}

// Run the playground
const playground = new Playground();
playground.start().catch(console.error);
