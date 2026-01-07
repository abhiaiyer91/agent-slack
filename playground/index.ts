#!/usr/bin/env node
/**
 * Agent Slack Playground Runner
 *
 * Entry point for running demos and interactive playground.
 */

const args = process.argv.slice(2);
const command = args[0] || 'help';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  dim: '\x1b[2m',
};

function printHelp(): void {
  console.log(`
${c.cyan}╔═══════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ${c.bold}🤖 Agent Slack Playground${c.reset}${c.cyan}                                   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝${c.reset}

${c.bold}Usage:${c.reset} npm run playground [command]

${c.bold}Commands:${c.reset}

  ${c.yellow}demo${c.reset}          Run the live collaboration demo
                Watch agents collaborate on a deployment decision

  ${c.yellow}interactive${c.reset}   Start the interactive CLI
                Chat with agents and watch them respond

  ${c.yellow}help${c.reset}          Show this help message

${c.bold}Examples:${c.reset}

  ${c.dim}# Watch the live demo${c.reset}
  npm run demo

  ${c.dim}# Start interactive playground${c.reset}
  npm run playground

${c.bold}Quick Start:${c.reset}

  1. Run ${c.green}npm run demo${c.reset} to see agents in action
  2. Run ${c.green}npm run playground${c.reset} and type a message
  3. Use ${c.green}@agent-name${c.reset} to mention specific agents
  4. Type ${c.green}/help${c.reset} for available commands

${c.dim}More info: https://github.com/your-org/agent-slack${c.reset}
`);
}

switch (command) {
  case 'demo':
    import('./live-demo.js');
    break;
  case 'interactive':
  case 'cli':
    import('./cli.js');
    break;
  case 'help':
  default:
    printHelp();
    break;
}
