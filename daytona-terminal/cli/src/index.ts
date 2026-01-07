#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import WebSocket from 'ws';
import { createInterface } from 'readline';

const API_URL = process.env.DAYTONA_TERMINAL_API_URL || 'http://localhost:8000';
const WS_URL = process.env.DAYTONA_TERMINAL_WS_URL || 'ws://localhost:8000';

// API client
async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

const program = new Command();

program
  .name('dt')
  .description(chalk.bold('🚀 Daytona Terminal') + ' - The best AI terminal')
  .version('0.1.0');

// ============================================================================
// Workspace Commands
// ============================================================================

program
  .command('list')
  .alias('ls')
  .description('List all workspaces')
  .action(async () => {
    const spinner = ora('Fetching workspaces...').start();

    try {
      const data = await api<{ workspaces: any[]; total: number }>('/workspaces');
      spinner.stop();

      if (data.workspaces.length === 0) {
        console.log(chalk.dim('No workspaces found. Create one with: dt create <name>'));
        return;
      }

      console.log(chalk.bold('\n📦 Workspaces\n'));

      const statusColors: Record<string, (s: string) => string> = {
        running: chalk.green,
        stopped: chalk.dim,
        creating: chalk.yellow,
        starting: chalk.yellow,
        stopping: chalk.yellow,
        error: chalk.red,
      };

      for (const ws of data.workspaces) {
        const color = statusColors[ws.status] || chalk.white;
        const status = color(`● ${ws.status}`);
        const ai = ws.aiAssistant ? chalk.magenta(` 🤖 ${ws.aiAssistant}`) : '';
        console.log(`  ${chalk.bold(ws.name)} ${chalk.dim(`(${ws.id.slice(0, 8)})`)} ${status}${ai}`);
        if (ws.repositoryUrl) {
          console.log(chalk.dim(`    └─ ${ws.repositoryUrl}`));
        }
      }
      console.log();
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error}`));
    }
  });

program
  .command('create <name>')
  .description('Create a new workspace')
  .option('-r, --repo <url>', 'Repository URL')
  .option('-b, --branch <branch>', 'Git branch')
  .option('-a, --ai <type>', 'AI assistant (claude, openai)')
  .action(async (name, options) => {
    const spinner = ora(`Creating workspace "${name}"...`).start();

    try {
      const workspace = await api<any>('/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          name,
          repositoryUrl: options.repo,
          branch: options.branch,
          aiAssistant: options.ai,
        }),
      });

      spinner.succeed(chalk.green('Workspace created!'));
      console.log();
      console.log(`  ${chalk.bold('ID:')} ${workspace.id}`);
      console.log(`  ${chalk.bold('Name:')} ${workspace.name}`);
      console.log(`  ${chalk.bold('Status:')} ${workspace.status}`);
      if (workspace.aiAssistant) {
        console.log(`  ${chalk.bold('AI:')} ${workspace.aiAssistant}`);
      }
      console.log();
      console.log(chalk.dim(`Connect with: dt connect ${workspace.id}`));
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error}`));
    }
  });

program
  .command('delete <id>')
  .description('Delete a workspace')
  .option('-f, --force', 'Skip confirmation')
  .action(async (id, options) => {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Delete workspace ${id}?`,
        default: false,
      }]);
      if (!confirm) return;
    }

    const spinner = ora('Deleting workspace...').start();

    try {
      await api(`/workspaces/${id}`, { method: 'DELETE' });
      spinner.succeed(chalk.green('Workspace deleted'));
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error}`));
    }
  });

program
  .command('start <id>')
  .description('Start a workspace')
  .action(async (id) => {
    const spinner = ora('Starting workspace...').start();

    try {
      const workspace = await api<any>(`/workspaces/${id}/start`, { method: 'POST' });
      spinner.succeed(chalk.green(`Workspace ${workspace.name} is ${workspace.status}`));
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error}`));
    }
  });

program
  .command('stop <id>')
  .description('Stop a workspace')
  .action(async (id) => {
    const spinner = ora('Stopping workspace...').start();

    try {
      const workspace = await api<any>(`/workspaces/${id}/stop`, { method: 'POST' });
      spinner.succeed(chalk.green(`Workspace ${workspace.name} is ${workspace.status}`));
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error}`));
    }
  });

// ============================================================================
// Terminal Commands
// ============================================================================

program
  .command('connect <workspaceId>')
  .alias('c')
  .description('Connect to a workspace terminal')
  .option('-s, --shell <shell>', 'Shell to use')
  .action(async (workspaceId, options) => {
    const spinner = ora('Creating terminal session...').start();

    try {
      // Create session
      const session = await api<any>('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId,
          shell: options.shell,
        }),
      });

      spinner.stop();
      console.log(chalk.dim(`Connecting to session ${session.id.slice(0, 8)}...`));

      // Connect WebSocket
      const ws = new WebSocket(`${WS_URL}/ws/terminal/${session.id}`);

      // Set up raw mode for terminal
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();

      // Handle resize
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

      ws.on('open', () => {
        sendResize();
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'output' && msg.data) {
            process.stdout.write(msg.data);
          } else if (msg.type === 'suggestion') {
            // Show AI suggestion
            console.log(chalk.yellow(`\n💡 AI: ${msg.suggestion.text}`));
            if (msg.suggestion.commands.length > 0) {
              console.log(chalk.dim('   Suggested: ') + chalk.cyan(msg.suggestion.commands.join(' | ')));
            }
          } else if (msg.type === 'error') {
            console.error(chalk.red(`\nError: ${msg.message}`));
          }
        } catch {
          // Ignore parse errors
        }
      });

      ws.on('close', () => {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        console.log(chalk.dim('\nSession ended'));
        process.exit(0);
      });

      ws.on('error', (error) => {
        console.error(chalk.red(`\nWebSocket error: ${error.message}`));
      });

      // Send input to terminal
      process.stdin.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data: data.toString() }));
        }
      });

      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        ws.close();
      });

    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error}`));
    }
  });

program
  .command('exec <workspaceId> <command...>')
  .description('Execute a command in a workspace')
  .action(async (workspaceId, commandParts) => {
    const command = commandParts.join(' ');
    const spinner = ora(`Executing: ${command}`).start();

    try {
      const result = await api<{ output: string; exitCode: number }>(`/workspaces/${workspaceId}/exec`, {
        method: 'POST',
        body: JSON.stringify({ command }),
      });

      spinner.stop();
      console.log(result.output);

      if (result.exitCode !== 0) {
        console.log(chalk.red(`Exit code: ${result.exitCode}`));
        process.exit(result.exitCode);
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error}`));
      process.exit(1);
    }
  });

// ============================================================================
// AI Commands
// ============================================================================

program
  .command('ai <workspaceId>')
  .description('Start an AI assistant session')
  .option('-a, --assistant <type>', 'AI assistant (claude, openai)', 'claude')
  .action(async (workspaceId, options) => {
    const spinner = ora('Starting AI session...').start();

    try {
      // Create terminal session
      const session = await api<any>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      });

      // Create AI conversation
      const conversation = await api<any>('/ai/conversations', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: session.id,
          assistantType: options.assistant,
        }),
      });

      spinner.stop();

      console.log(chalk.bold(`\n🤖 AI Assistant (${options.assistant})`));
      console.log(chalk.dim('Type your questions. Use "exit" to quit.\n'));

      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = () => {
        rl.question(chalk.cyan('You: '), async (input) => {
          const trimmed = input.trim();

          if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
            console.log(chalk.dim('\nAI session ended'));
            rl.close();
            process.exit(0);
          }

          if (!trimmed) {
            prompt();
            return;
          }

          const aiSpinner = ora('Thinking...').start();

          try {
            const response = await api<any>(`/ai/conversations/${conversation.id}/message`, {
              method: 'POST',
              body: JSON.stringify({
                prompt: trimmed,
                includeTerminalContext: true,
              }),
            });

            aiSpinner.stop();

            console.log(chalk.green('\nAI: ') + response.message);

            if (response.suggestedCommands.length > 0) {
              console.log(chalk.yellow('\n📋 Suggested commands:'));
              response.suggestedCommands.forEach((cmd: string, i: number) => {
                console.log(chalk.dim(`  ${i + 1}. `) + chalk.cyan(cmd));
              });

              // Ask to execute
              rl.question(chalk.dim('\nEnter number to execute (or Enter to skip): '), async (choice) => {
                const idx = parseInt(choice) - 1;
                if (idx >= 0 && idx < response.suggestedCommands.length) {
                  const cmd = response.suggestedCommands[idx];
                  console.log(chalk.dim(`\nExecuting: ${cmd}\n`));

                  try {
                    const result = await api<{ output: string; exitCode: number }>(`/workspaces/${workspaceId}/exec`, {
                      method: 'POST',
                      body: JSON.stringify({ command: cmd }),
                    });
                    console.log(result.output);
                  } catch (e) {
                    console.error(chalk.red(`Failed: ${e}`));
                  }
                }
                console.log();
                prompt();
              });
              return;
            }

            console.log();
            prompt();
          } catch (error) {
            aiSpinner.fail(chalk.red(`Failed: ${error}`));
            prompt();
          }
        });
      };

      prompt();
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error}`));
    }
  });

// ============================================================================
// Info Commands
// ============================================================================

program
  .command('info')
  .description('Show API and connection info')
  .action(async () => {
    const spinner = ora('Fetching info...').start();

    try {
      const info = await api<any>('/');
      spinner.stop();

      console.log(chalk.bold('\n🚀 Daytona Terminal\n'));
      console.log(`  ${chalk.bold('API:')} ${API_URL}`);
      console.log(`  ${chalk.bold('WebSocket:')} ${WS_URL}`);
      console.log();
      console.log(chalk.bold('  Integrations:'));
      console.log(`    Daytona: ${info.integrations.daytona ? chalk.green('✓') : chalk.dim('○')}`);
      console.log(`    Claude:  ${info.integrations.claude ? chalk.green('✓') : chalk.dim('○')}`);
      console.log(`    OpenAI:  ${info.integrations.openai ? chalk.green('✓') : chalk.dim('○')}`);
      console.log();
      console.log(chalk.bold('  Features:'));
      console.log(`    Auto-fix:    ${info.features.autoFix ? chalk.green('✓') : chalk.dim('○')}`);
      console.log(`    Predictive:  ${info.features.predictiveCommands ? chalk.green('✓') : chalk.dim('○')}`);
      console.log();
    } catch (error) {
      spinner.fail(chalk.red(`Failed to connect: ${error}`));
      console.log(chalk.dim(`\nMake sure the server is running at ${API_URL}`));
    }
  });

program
  .command('sessions')
  .description('List active terminal sessions')
  .option('-w, --workspace <id>', 'Filter by workspace')
  .action(async (options) => {
    const spinner = ora('Fetching sessions...').start();

    try {
      const endpoint = options.workspace
        ? `/sessions?workspaceId=${options.workspace}`
        : '/sessions';
      const sessions = await api<any[]>(endpoint);
      spinner.stop();

      if (sessions.length === 0) {
        console.log(chalk.dim('No active sessions'));
        return;
      }

      console.log(chalk.bold('\n🖥️  Terminal Sessions\n'));

      for (const s of sessions) {
        const statusColor = s.status === 'connected' ? chalk.green : chalk.red;
        console.log(`  ${chalk.dim(s.id.slice(0, 8))} ${statusColor(`● ${s.status}`)} ${s.cols}x${s.rows}`);
        console.log(chalk.dim(`    └─ workspace: ${s.workspaceId.slice(0, 8)}`));
      }
      console.log();
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error}`));
    }
  });

program.parse();
