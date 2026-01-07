/**
 * Workflow Engine - Saved command sequences with conditions
 * 
 * Better than Warp's workflows because:
 * - Visual workflow builder
 * - Conditional steps
 * - Error handling
 * - Variables and interpolation
 * - AI-generated workflows
 */

import { v4 as uuid } from 'uuid';
import type { Sandterm } from '../sandterm.js';
import type { AIService } from '../ai/service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('workflow');

export interface WorkflowStep {
  id: string;
  name: string;
  command: string;
  
  // Conditions
  condition?: {
    type: 'always' | 'on_success' | 'on_failure' | 'if_output_contains' | 'if_output_matches';
    value?: string;
  };
  
  // Error handling
  onError?: 'stop' | 'continue' | 'retry' | 'run_step';
  retryCount?: number;
  errorStepId?: string;
  
  // Timing
  delay?: number;  // ms before running
  timeout?: number; // ms before timeout
  
  // Variable capture
  captureOutput?: {
    variable: string;
    regex?: string;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  variables: Record<string, string>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  sandboxId: string;
  sessionId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  currentStepIndex: number;
  variables: Record<string, string>;
  stepResults: Array<{
    stepId: string;
    status: 'success' | 'failure' | 'skipped';
    output: string;
    duration: number;
    error?: string;
  }>;
  startedAt: Date;
  completedAt?: Date;
}

// Built-in workflow templates
export const WORKFLOW_TEMPLATES: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Git Commit & Push',
    description: 'Stage, commit, and push changes',
    tags: ['git'],
    variables: { message: 'Update' },
    steps: [
      { id: '1', name: 'Stage changes', command: 'git add .' },
      { id: '2', name: 'Commit', command: 'git commit -m "${message}"', condition: { type: 'on_success' } },
      { id: '3', name: 'Push', command: 'git push', condition: { type: 'on_success' }, onError: 'run_step', errorStepId: '4' },
      { id: '4', name: 'Pull and push', command: 'git pull --rebase && git push', condition: { type: 'on_failure' } },
    ],
  },
  {
    name: 'Fresh Install',
    description: 'Clean and reinstall dependencies',
    tags: ['npm', 'node'],
    variables: {},
    steps: [
      { id: '1', name: 'Remove node_modules', command: 'rm -rf node_modules' },
      { id: '2', name: 'Remove lock file', command: 'rm -f package-lock.json pnpm-lock.yaml yarn.lock' },
      { id: '3', name: 'Install', command: 'npm install', timeout: 120000 },
    ],
  },
  {
    name: 'Docker Rebuild',
    description: 'Stop, rebuild, and start containers',
    tags: ['docker'],
    variables: {},
    steps: [
      { id: '1', name: 'Stop containers', command: 'docker compose down' },
      { id: '2', name: 'Rebuild', command: 'docker compose build --no-cache', timeout: 300000 },
      { id: '3', name: 'Start', command: 'docker compose up -d' },
      { id: '4', name: 'Show logs', command: 'docker compose logs -f --tail=50', delay: 2000 },
    ],
  },
  {
    name: 'Create PR',
    description: 'Create a pull request from current branch',
    tags: ['git', 'github'],
    variables: { title: '', body: '' },
    steps: [
      { id: '1', name: 'Push branch', command: 'git push -u origin $(git branch --show-current)' },
      { id: '2', name: 'Create PR', command: 'gh pr create --title "${title}" --body "${body}"', condition: { type: 'on_success' } },
    ],
  },
  {
    name: 'Test & Deploy',
    description: 'Run tests, build, and deploy',
    tags: ['ci', 'deploy'],
    variables: {},
    steps: [
      { id: '1', name: 'Install deps', command: 'npm ci' },
      { id: '2', name: 'Run tests', command: 'npm test', onError: 'stop' },
      { id: '3', name: 'Build', command: 'npm run build', condition: { type: 'on_success' } },
      { id: '4', name: 'Deploy', command: 'npm run deploy', condition: { type: 'on_success' } },
    ],
  },
];

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private runs: Map<string, WorkflowRun> = new Map();

  constructor(
    private sandterm: Sandterm,
    private ai?: AIService
  ) {
    // Load built-in templates
    WORKFLOW_TEMPLATES.forEach(template => {
      const workflow: Workflow = {
        ...template,
        id: uuid(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.workflows.set(workflow.id, workflow);
    });
  }

  /**
   * Create a new workflow
   */
  createWorkflow(data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Workflow {
    const workflow: Workflow = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * Generate a workflow using AI
   */
  async generateWorkflow(description: string): Promise<Workflow | null> {
    if (!this.ai?.isConfigured()) {
      throw new Error('AI is not configured');
    }

    const prompt = `Create a shell workflow for: "${description}"

Return a JSON object with this structure:
{
  "name": "Workflow Name",
  "description": "What it does",
  "tags": ["tag1", "tag2"],
  "variables": {"var1": "default"},
  "steps": [
    {"id": "1", "name": "Step name", "command": "command here"},
    {"id": "2", "name": "Step 2", "command": "command 2", "condition": {"type": "on_success"}}
  ]
}

Use \${variable} for variable interpolation. Only return valid JSON.`;

    const response = await this.ai.complete(prompt, 1024);
    
    try {
      const data = JSON.parse(response);
      return this.createWorkflow(data);
    } catch {
      logger.error('Failed to parse AI workflow response');
      return null;
    }
  }

  /**
   * Run a workflow
   */
  async runWorkflow(
    workflowId: string,
    sandboxId: string,
    variables?: Record<string, string>
  ): Promise<WorkflowRun> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

    const session = await this.sandterm.createSession(sandboxId);
    
    const run: WorkflowRun = {
      id: uuid(),
      workflowId,
      sandboxId,
      sessionId: session.id,
      status: 'running',
      currentStepIndex: 0,
      variables: { ...workflow.variables, ...variables },
      stepResults: [],
      startedAt: new Date(),
    };

    this.runs.set(run.id, run);
    
    // Execute steps
    this.executeWorkflow(run, workflow).catch(error => {
      logger.error({ error, runId: run.id }, 'Workflow execution failed');
      run.status = 'failed';
    });

    return run;
  }

  private async executeWorkflow(run: WorkflowRun, workflow: Workflow): Promise<void> {
    for (let i = 0; i < workflow.steps.length; i++) {
      if (run.status === 'cancelled') break;
      
      run.currentStepIndex = i;
      const step = workflow.steps[i];
      
      // Check condition
      if (!this.shouldRunStep(step, run)) {
        run.stepResults.push({
          stepId: step.id,
          status: 'skipped',
          output: '',
          duration: 0,
        });
        continue;
      }

      // Apply delay
      if (step.delay) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }

      // Interpolate variables
      const command = this.interpolate(step.command, run.variables);
      
      // Execute with retry logic
      const result = await this.executeStep(run, step, command);
      run.stepResults.push(result);

      // Handle errors
      if (result.status === 'failure') {
        if (step.onError === 'stop') {
          run.status = 'failed';
          break;
        } else if (step.onError === 'run_step' && step.errorStepId) {
          // Find and run error handler step
          const errorStep = workflow.steps.find(s => s.id === step.errorStepId);
          if (errorStep) {
            const errorCommand = this.interpolate(errorStep.command, run.variables);
            await this.executeStep(run, errorStep, errorCommand);
          }
        }
      }
    }

    run.status = run.status === 'running' ? 'completed' : run.status;
    run.completedAt = new Date();
    
    await this.sandterm.closeSession(run.sessionId);
  }

  private async executeStep(
    run: WorkflowRun,
    step: WorkflowStep,
    command: string
  ): Promise<WorkflowRun['stepResults'][0]> {
    const startTime = Date.now();
    let output = '';
    let retries = 0;
    const maxRetries = step.retryCount || 0;

    while (retries <= maxRetries) {
      output = '';
      
      const result = await new Promise<{ success: boolean; output: string }>((resolve) => {
        let commandOutput = '';
        let promptReturned = false;
        
        const unsub = this.sandterm.on(run.sessionId, (event) => {
          if (event.type === 'output') {
            commandOutput += event.data;
            // Detect command completion (prompt returned)
            if (event.data.includes('$ ') || event.data.includes('# ')) {
              promptReturned = true;
            }
          }
        });

        this.sandterm.writeToSession(run.sessionId, command + '\n');

        // Wait for completion or timeout
        const timeout = step.timeout || 30000;
        const checkInterval = setInterval(() => {
          if (promptReturned) {
            clearInterval(checkInterval);
            unsub();
            // Check for common error patterns
            const hasError = /error|Error|ERROR|failed|Failed|FAILED/.test(commandOutput) &&
                           !/0 error|no error/i.test(commandOutput);
            resolve({ success: !hasError, output: commandOutput });
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          unsub();
          resolve({ success: false, output: commandOutput + '\n[TIMEOUT]' });
        }, timeout);
      });

      output = result.output;
      
      if (result.success) {
        // Capture output to variable if configured
        if (step.captureOutput) {
          let captured = output;
          if (step.captureOutput.regex) {
            const match = output.match(new RegExp(step.captureOutput.regex));
            captured = match?.[1] || match?.[0] || '';
          }
          run.variables[step.captureOutput.variable] = captured.trim();
        }

        return {
          stepId: step.id,
          status: 'success',
          output,
          duration: Date.now() - startTime,
        };
      }

      retries++;
      if (retries <= maxRetries) {
        logger.info({ step: step.name, retry: retries }, 'Retrying step');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      stepId: step.id,
      status: 'failure',
      output,
      duration: Date.now() - startTime,
      error: 'Command failed',
    };
  }

  private shouldRunStep(step: WorkflowStep, run: WorkflowRun): boolean {
    if (!step.condition || step.condition.type === 'always') return true;
    
    const lastResult = run.stepResults[run.stepResults.length - 1];
    if (!lastResult) return true;

    switch (step.condition.type) {
      case 'on_success':
        return lastResult.status === 'success';
      case 'on_failure':
        return lastResult.status === 'failure';
      case 'if_output_contains':
        return lastResult.output.includes(step.condition.value || '');
      case 'if_output_matches':
        return new RegExp(step.condition.value || '').test(lastResult.output);
      default:
        return true;
    }
  }

  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\$\{(\w+)\}/g, (_, key) => variables[key] || '');
  }

  /**
   * List all workflows
   */
  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow run status
   */
  getRun(runId: string): WorkflowRun | null {
    return this.runs.get(runId) || null;
  }

  /**
   * Cancel a running workflow
   */
  cancelRun(runId: string): void {
    const run = this.runs.get(runId);
    if (run && run.status === 'running') {
      run.status = 'cancelled';
    }
  }
}
