/**
 * Workflow Primitive
 *
 * Workflows are multi-step processes involving multiple agents.
 * They define a sequence of steps, each handled by specific agents,
 * with automatic handoffs between steps.
 */
import { nanoid } from 'nanoid';
/**
 * Status of a workflow.
 */
export const WorkflowStatus = {
    DRAFT: 'draft',
    READY: 'ready',
    RUNNING: 'running',
    PAUSED: 'paused',
    WAITING: 'waiting',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
};
/**
 * Status of a workflow step.
 */
export const StepStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
};
export class WorkflowStep {
    id;
    name;
    description;
    assignedTo;
    requiredCapability;
    status;
    inputMapping;
    inputs;
    outputs;
    executedBy;
    startedAt;
    completedAt;
    errorMessage;
    runIf;
    skipOnFailure;
    maxRetries;
    retryCount;
    constructor(data) {
        this.id = data.id ?? nanoid();
        this.name = data.name;
        this.description = data.description ?? '';
        this.assignedTo = data.assignedTo;
        this.requiredCapability = data.requiredCapability;
        this.status = data.status ?? StepStatus.PENDING;
        this.inputMapping = data.inputMapping ?? {};
        this.inputs = data.inputs ?? {};
        this.outputs = data.outputs ?? {};
        this.executedBy = data.executedBy;
        this.startedAt = data.startedAt;
        this.completedAt = data.completedAt;
        this.errorMessage = data.errorMessage ?? '';
        this.runIf = data.runIf;
        this.skipOnFailure = data.skipOnFailure ?? false;
        this.maxRetries = data.maxRetries ?? 0;
        this.retryCount = data.retryCount ?? 0;
    }
    get isComplete() {
        return (this.status === StepStatus.COMPLETED ||
            this.status === StepStatus.FAILED ||
            this.status === StepStatus.SKIPPED);
    }
    get duration() {
        if (this.startedAt && this.completedAt) {
            return this.completedAt.getTime() - this.startedAt.getTime();
        }
        return undefined;
    }
    start(agentId) {
        this.status = StepStatus.RUNNING;
        this.executedBy = agentId;
        this.startedAt = new Date();
        return this;
    }
    complete(outputs) {
        this.status = StepStatus.COMPLETED;
        this.completedAt = new Date();
        if (outputs) {
            this.outputs = outputs;
        }
        return this;
    }
    fail(error) {
        this.status = StepStatus.FAILED;
        this.completedAt = new Date();
        this.errorMessage = error;
        return this;
    }
    skip() {
        this.status = StepStatus.SKIPPED;
        this.completedAt = new Date();
        return this;
    }
    reset() {
        this.status = StepStatus.PENDING;
        this.startedAt = undefined;
        this.completedAt = undefined;
        this.errorMessage = '';
        this.outputs = {};
        this.retryCount += 1;
        return this;
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            assignedTo: this.assignedTo,
            requiredCapability: this.requiredCapability,
            status: this.status,
            executedBy: this.executedBy,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            errorMessage: this.errorMessage,
            inputMapping: this.inputMapping,
            inputs: this.inputs,
            outputs: this.outputs,
            runIf: this.runIf,
            skipOnFailure: this.skipOnFailure,
            maxRetries: this.maxRetries,
            retryCount: this.retryCount,
        };
    }
    toString() {
        const statusIcons = {
            pending: '⏸️',
            running: '🔄',
            completed: '✅',
            failed: '❌',
            skipped: '⏭️',
        };
        const icon = statusIcons[this.status];
        const agent = this.executedBy ?? this.assignedTo ?? `[${this.requiredCapability}]`;
        return `${icon} ${this.name} (${agent})`;
    }
}
/**
 * A multi-step workflow executed by multiple agents.
 */
export class Workflow {
    id;
    name;
    description;
    steps;
    currentStepIndex;
    status;
    channelId;
    threadId;
    triggeredBy;
    inputs;
    outputs;
    createdAt;
    startedAt;
    completedAt;
    errorMessage;
    continueOnStepFailure;
    constructor(data) {
        this.id = data.id ?? nanoid();
        this.name = data.name;
        this.description = data.description ?? '';
        this.steps = data.steps ?? [];
        this.currentStepIndex = 0;
        this.status = WorkflowStatus.DRAFT;
        this.channelId = data.channelId;
        this.inputs = {};
        this.outputs = {};
        this.createdAt = new Date();
        this.errorMessage = '';
        this.continueOnStepFailure = data.continueOnStepFailure ?? false;
    }
    get isRunning() {
        return this.status === WorkflowStatus.RUNNING;
    }
    get isComplete() {
        return (this.status === WorkflowStatus.COMPLETED ||
            this.status === WorkflowStatus.FAILED ||
            this.status === WorkflowStatus.CANCELLED);
    }
    get currentStep() {
        return this.steps[this.currentStepIndex];
    }
    get progressPercent() {
        if (this.steps.length === 0)
            return 0;
        const completed = this.steps.filter((s) => s.isComplete).length;
        return Math.round((completed / this.steps.length) * 100);
    }
    get duration() {
        if (this.startedAt && this.completedAt) {
            return this.completedAt.getTime() - this.startedAt.getTime();
        }
        return undefined;
    }
    addStep(data) {
        const step = new WorkflowStep(data);
        this.steps.push(step);
        return step;
    }
    start(triggeredBy, inputs) {
        this.status = WorkflowStatus.RUNNING;
        this.triggeredBy = triggeredBy;
        this.startedAt = new Date();
        this.currentStepIndex = 0;
        if (inputs) {
            this.inputs = inputs;
        }
        return this;
    }
    advance() {
        this.currentStepIndex += 1;
        if (this.currentStepIndex >= this.steps.length) {
            this.complete();
            return undefined;
        }
        return this.currentStep;
    }
    complete(outputs) {
        this.status = WorkflowStatus.COMPLETED;
        this.completedAt = new Date();
        if (outputs) {
            this.outputs = outputs;
        }
        else {
            // Collect outputs from all steps
            for (const step of this.steps) {
                this.outputs[step.name] = step.outputs;
            }
        }
        return this;
    }
    fail(error) {
        this.status = WorkflowStatus.FAILED;
        this.completedAt = new Date();
        this.errorMessage = error;
        return this;
    }
    pause() {
        this.status = WorkflowStatus.PAUSED;
        return this;
    }
    resume() {
        if (this.status === WorkflowStatus.PAUSED) {
            this.status = WorkflowStatus.RUNNING;
        }
        return this;
    }
    cancel() {
        this.status = WorkflowStatus.CANCELLED;
        this.completedAt = new Date();
        return this;
    }
    /**
     * Get inputs for a step based on input mapping.
     */
    getStepInputs(step) {
        const inputs = { ...step.inputs };
        for (const [targetKey, source] of Object.entries(step.inputMapping)) {
            const parts = source.split('.');
            if (parts.length === 2) {
                const [sourceName, sourceKey] = parts;
                if (sourceName === 'workflow') {
                    if (sourceKey in this.inputs) {
                        inputs[targetKey] = this.inputs[sourceKey];
                    }
                }
                else {
                    // Find step by name
                    const sourceStep = this.steps.find((s) => s.name === sourceName);
                    if (sourceStep && sourceKey in sourceStep.outputs) {
                        inputs[targetKey] = sourceStep.outputs[sourceKey];
                    }
                }
            }
        }
        return inputs;
    }
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            status: this.status,
            progressPercent: this.progressPercent,
            currentStep: this.currentStep?.name,
            stepsCompleted: this.steps.filter((s) => s.status === StepStatus.COMPLETED).length,
            stepsTotal: this.steps.length,
            duration: this.duration,
        };
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            status: this.status,
            steps: this.steps.map((s) => s.toJSON()),
            currentStepIndex: this.currentStepIndex,
            progressPercent: this.progressPercent,
            channelId: this.channelId,
            threadId: this.threadId,
            triggeredBy: this.triggeredBy,
            inputs: this.inputs,
            outputs: this.outputs,
            createdAt: this.createdAt,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            errorMessage: this.errorMessage,
        };
    }
    toString() {
        const statusIcons = {
            draft: '📝',
            ready: '🟢',
            running: '🔄',
            paused: '⏸️',
            waiting: '⏳',
            completed: '✅',
            failed: '❌',
            cancelled: '🚫',
        };
        const icon = statusIcons[this.status];
        return `${icon} ${this.name} (${this.progressPercent}% - ${this.steps.length} steps)`;
    }
}
/**
 * Builder pattern for creating workflows.
 */
export class WorkflowBuilder {
    _workflow;
    constructor(name, description = '') {
        this._workflow = new Workflow({ name, description });
    }
    addStep(data) {
        this._workflow.addStep(data);
        return this;
    }
    withChannel(channelId) {
        this._workflow.channelId = channelId;
        return this;
    }
    withInputs(inputs) {
        this._workflow.inputs = inputs;
        return this;
    }
    continueOnFailure() {
        this._workflow.continueOnStepFailure = true;
        return this;
    }
    build() {
        this._workflow.status = WorkflowStatus.READY;
        return this._workflow;
    }
}
/**
 * Manages workflows within a workspace.
 */
export class WorkflowManager {
    _workflows = new Map();
    _templates = new Map();
    add(workflow) {
        this._workflows.set(workflow.id, workflow);
        return workflow;
    }
    get(workflowId) {
        return this._workflows.get(workflowId);
    }
    listRunning() {
        return Array.from(this._workflows.values()).filter((w) => w.isRunning);
    }
    listByChannel(channelId) {
        return Array.from(this._workflows.values()).filter((w) => w.channelId === channelId);
    }
    saveTemplate(name, workflow) {
        this._templates.set(name, workflow);
    }
    createFromTemplate(templateName) {
        const template = this._templates.get(templateName);
        if (!template)
            return undefined;
        const newWorkflow = new Workflow({
            name: template.name,
            description: template.description,
            continueOnStepFailure: template.continueOnStepFailure,
        });
        for (const step of template.steps) {
            newWorkflow.addStep({
                name: step.name,
                description: step.description,
                assignedTo: step.assignedTo,
                requiredCapability: step.requiredCapability,
                inputMapping: { ...step.inputMapping },
                skipOnFailure: step.skipOnFailure,
                maxRetries: step.maxRetries,
            });
        }
        newWorkflow.status = WorkflowStatus.READY;
        return this.add(newWorkflow);
    }
    getStats() {
        const allWorkflows = Array.from(this._workflows.values());
        return {
            total: allWorkflows.length,
            running: allWorkflows.filter((w) => w.isRunning).length,
            completed: allWorkflows.filter((w) => w.status === WorkflowStatus.COMPLETED).length,
            failed: allWorkflows.filter((w) => w.status === WorkflowStatus.FAILED).length,
            templates: this._templates.size,
        };
    }
}
//# sourceMappingURL=workflow.js.map