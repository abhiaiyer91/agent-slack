#!/usr/bin/env node

/**
 * sandterm CLI - The AI-powered terminal for any sandbox
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import WebSocket from 'ws';
import { createInterface } from 'readline';

const API_URL = process.env.SANDTERM_API_URL || 'http://localhost:8000';
const WS_URL = process.env.SANDTERM_WS_URL || 'ws://localhost:8000';

// API client
async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' })) as { error?: string };
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const program = new Command();

program
  .name('sandterm')
  .description(chalk.bold('🖥️  sandterm') + ' - The AI-powered terminal for any sandbox')
  .version('0.1.0');

// ============================================================================
// Sandbox Commands
// ============================================================================

program
  .command('list')
  .alias('ls')
  .description('List all sandboxes')
  .action(async () => {
    const spinner = ora('Fetching sandboxes...').start();
    try {
      const sandboxes = await api<Array<{ id: string; name: string; status: string }>>('/sandboxes');
      spinner.stop();

      if (sandboxes.length === 0) {
        console.log(chalk.dim('No sandboxes. Create one with: sandterm create <name>'));
        return;
      }

      console.log(chalk.bold('\n📦 Sandboxes\n'));
      for (const sb of sandboxes) {
        const color = sb.status === 'running' ? chalk.green : chalk.dim;
        console.log(`  ${chalk.bold(sb.name)} ${chalk.dim(`(${sb.id.slice(0, 8)})`)} ${color(`● ${sb.status}`)}`);
      }
      console.log();
    } catch (e) {
      spinner.fail(chalk.red(String(e)));
    }
  });

program
  .command('create <name>')
  .description('Create a new sandbox')
  .option('-t, --template <template>', 'Template to use')
  .option('-p, --provider <provider>', 'Provider (local, daytona, e2b)')
  .action(async (name, options) => {
    const spinner = ora(`Creating sandbox "${name}"...`).start();
    try {
      const sandbox = await api<{ id: string; name: string; status: string }>('/sandboxes', {
        method: 'POST',
        body: JSON.stringify({ name, template: options.template }),
      });
      spinner.succeed(chalk.green('Sandbox created!'));
      console.log(`\n  ${chalk.bold('ID:')} ${sandbox.id}`);
      console.log(`  ${chalk.bold('Name:')} ${sandbox.name}`);
      console.log(`  ${chalk.bold('Status:')} ${sandbox.status}`);
      console.log(chalk.dim(`\n  Connect with: sandterm connect ${sandbox.id}`));
    } catch (e) {
      spinner.fail(chalk.red(String(e)));
    }
  });

program
  .command('delete <id>')
  .description('Delete a sandbox')
  .option('-f, --force', 'Skip confirmation')
  .action(async (id, options) => {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Delete sandbox ${id}?`,
        default: false,
      }]);
      if (!confirm) return;
    }
    const spinner = ora('Deleting...').start();
    try {
      await api(`/sandboxes/${id}`, { method: 'DELETE' });
      spinner.succeed(chalk.green('Deleted'));
    } catch (e) {
      spinner.fail(chalk.red(String(e)));
    }
  });

program
  .command('start <id>')
  .description('Start a sandbox')
  .action(async (id) => {
    const spinner = ora('Starting...').start();
    try {
      const sb = await api<{ status: string }>(`/sandboxes/${id}/start`, { method: 'POST' });
      spinner.succeed(chalk.green(`Status: ${sb.status}`));
    } catch (e) {
      spinner.fail(chalk.red(String(e)));
    }
  });

program
  .command('stop <id>')
  .description('Stop a sandbox')
  .action(async (id) => {
    const spinner = ora('Stopping...').start();
    try {
      const sb = await api<{ status: string }>(`/sandboxes/${id}/stop`, { method: 'POST' });
      spinner.succeed(chalk.green(`Status: ${sb.status}`));
    } catch (e) {
      spinner.fail(chalk.red(String(e)));
    }
  });

// ============================================================================
// Terminal Commands
// ============================================================================

program
  .command('connect <sandboxId>')
  .alias('c')
  .description('Connect to a sandbox terminal')
  .action(async (sandboxId) => {
    const spinner = ora('Creating session...').start();
    try {
      const session = await api<{ id: string }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ sandboxId }),
      });
      spinner.stop();
      console.log(chalk.dim(`Connecting to ${session.id.slice(0, 8)}...`));

      const ws = new WebSocket(`${WS_URL}/ws/terminal/${session.id}`);

      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      process.stdin.resume();

      const sendResize = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'resize',
            cols: process.stdout.columns,
            rows: process.stdout.rows,
          }));
        }
      };

      process.stdout.on('resize', sendResize);
      ws.on('open', () => setTimeout(sendResize, 100));

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'output') process.stdout.write(msg.data);
          else if (msg.type === 'suggestion') {
            console.log(chalk.yellow(`\n💡 ${msg.suggestion.text}`));
            if (msg.suggestion.commands.length) {
              console.log(chalk.dim('   Suggested: ') + chalk.cyan(msg.suggestion.commands.join(' | ')));
            }
          }
        } catch {}
      });

      ws.on('close', () => {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        console.log(chalk.dim('\nSession ended'));
        process.exit(0);
      });

      process.stdin.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data: data.toString() }));
        }
      });

      process.on('SIGINT', () => ws.close());
    } catch (e) {
      spinner.fail(chalk.red(String(e)));
    }
  });

// ============================================================================
// AI Commands
// ============================================================================

program
  .command('ai <sandboxId>')
  .description('Start an AI assistant session')
  .action(async (sandboxId) => {
    const spinner = ora('Starting AI session...').start();
    try {
      const session = await api<{ id: string }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ sandboxId }),
      });
      spinner.stop();

      console.log(chalk.bold('\n🤖 AI Assistant'));
      console.log(chalk.dim('Type your questions. "exit" to quit.\n'));

      const rl = createInterface({ input: process.stdin, output: process.stdout });

      const prompt = () => {
        rl.question(chalk.cyan('You: '), async (input) => {
          if (input.toLowerCase() === 'exit') {
            rl.close();
            process.exit(0);
          }
          if (!input.trim()) return prompt();

          const aiSpinner = ora('Thinking...').start();
          try {
            const response = await api<{ message: string; commands: string[] }>('/ai/chat', {
              method: 'POST',
              body: JSON.stringify({ sessionId: session.id, prompt: input }),
            });
            aiSpinner.stop();
            console.log(chalk.green('\nAI: ') + response.message);
            if (response.commands.length) {
              console.log(chalk.yellow('\n📋 Commands:'));
              response.commands.forEach((c, i) => console.log(chalk.dim(`  ${i + 1}. `) + chalk.cyan(c)));
            }
            console.log();
          } catch (e) {
            aiSpinner.fail(chalk.red(String(e)));
          }
          prompt();
        });
      };
      prompt();
    } catch (e) {
      spinner.fail(chalk.red(String(e)));
    }
  });

// ============================================================================
// Info
// ============================================================================

program
  .command('info')
  .description('Show server info')
  .action(async () => {
    const spinner = ora('Fetching...').start();
    try {
      const info = await api<{ provider: { id: string; name: string }; providers: string[] }>('/');
      spinner.stop();
      console.log(chalk.bold('\n🖥️  sandterm\n'));
      console.log(`  ${chalk.bold('API:')} ${API_URL}`);
      console.log(`  ${chalk.bold('Provider:')} ${info.provider.name} (${info.provider.id})`);
      console.log(`  ${chalk.bold('Available:')} ${info.providers.join(', ')}`);
      console.log();
    } catch (e) {
      spinner.fail(chalk.red(`Failed to connect: ${e}`));
    }
  });

program.parse();
