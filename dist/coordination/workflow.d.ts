/**
 * Workflow Primitive
 *
 * Workflows are multi-step processes involving multiple agents.
 * They define a sequence of steps, each handled by specific agents,
 * with automatic handoffs between steps.
 */
/**
 * Status of a workflow.
 */
export declare const WorkflowStatus: {
    readonly DRAFT: "draft";
    readonly READY: "ready";
    readonly RUNNING: "running";
    readonly PAUSED: "paused";
    readonly WAITING: "waiting";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly CANCELLED: "cancelled";
};
export type WorkflowStatus = (typeof WorkflowStatus)[keyof typeof WorkflowStatus];
/**
 * Status of a workflow step.
 */
export declare const StepStatus: {
    readonly PENDING: "pending";
    readonly RUNNING: "running";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly SKIPPED: "skipped";
};
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];
/**
 * A single step in a workflow.
 */
export interface WorkflowStepData {
    id: string;
    name: string;
    description: string;
    assignedTo?: string;
    requiredCapability?: string;
    status: StepStatus;
    inputMapping: Record<string, string>;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    executedBy?: string;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage: string;
    runIf?: string;
    skipOnFailure: boolean;
    maxRetries: number;
    retryCount: number;
}
export declare class WorkflowStep {
    readonly id: string;
    name: string;
    description: string;
    assignedTo?: string;
    requiredCapability?: string;
    status: StepStatus;
    inputMapping: Record<string, string>;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    executedBy?: string;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage: string;
    runIf?: string;
    skipOnFailure: boolean;
    maxRetries: number;
    retryCount: number;
    constructor(data: Partial<WorkflowStepData> & {
        name: string;
    });
    get isComplete(): boolean;
    get duration(): number | undefined;
    start(agentId: string): this;
    complete(outputs?: Record<string, unknown>): this;
    fail(error: string): this;
    skip(): this;
    reset(): this;
    toJSON(): WorkflowStepData;
    toString(): string;
}
/**
 * A multi-step workflow executed by multiple agents.
 */
export declare class Workflow {
    readonly id: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    currentStepIndex: number;
    status: WorkflowStatus;
    channelId?: string;
    threadId?: string;
    triggeredBy?: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    readonly createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage: string;
    continueOnStepFailure: boolean;
    constructor(data: Partial<{
        id: string;
        name: string;
        description: string;
        steps: WorkflowStep[];
        channelId: string;
        continueOnStepFailure: boolean;
    }> & {
        name: string;
    });
    get isRunning(): boolean;
    get isComplete(): boolean;
    get currentStep(): WorkflowStep | undefined;
    get progressPercent(): number;
    get duration(): number | undefined;
    addStep(data: {
        name: string;
        description?: string;
        assignedTo?: string;
        requiredCapability?: string;
        inputMapping?: Record<string, string>;
        skipOnFailure?: boolean;
        maxRetries?: number;
    }): WorkflowStep;
    start(triggeredBy: string, inputs?: Record<string, unknown>): this;
    advance(): WorkflowStep | undefined;
    complete(outputs?: Record<string, unknown>): this;
    fail(error: string): this;
    pause(): this;
    resume(): this;
    cancel(): this;
    /**
     * Get inputs for a step based on input mapping.
     */
    getStepInputs(step: WorkflowStep): Record<string, unknown>;
    getSummary(): {
        id: string;
        name: string;
        status: WorkflowStatus;
        progressPercent: number;
        currentStep: string | undefined;
        stepsCompleted: number;
        stepsTotal: number;
        duration: number | undefined;
    };
    toJSON(): {
        id: string;
        name: string;
        description: string;
        status: WorkflowStatus;
        steps: WorkflowStepData[];
        currentStepIndex: number;
        progressPercent: number;
        channelId: string | undefined;
        threadId: string | undefined;
        triggeredBy: string | undefined;
        inputs: Record<string, unknown>;
        outputs: Record<string, unknown>;
        createdAt: Date;
        startedAt: Date | undefined;
        completedAt: Date | undefined;
        errorMessage: string;
    };
    toString(): string;
}
/**
 * Builder pattern for creating workflows.
 */
export declare class WorkflowBuilder {
    private readonly _workflow;
    constructor(name: string, description?: string);
    addStep(data: {
        name: string;
        description?: string;
        assignedTo?: string;
        requiredCapability?: string;
        inputMapping?: Record<string, string>;
        skipOnFailure?: boolean;
        maxRetries?: number;
    }): this;
    withChannel(channelId: string): this;
    withInputs(inputs: Record<string, unknown>): this;
    continueOnFailure(): this;
    build(): Workflow;
}
/**
 * Manages workflows within a workspace.
 */
export declare class WorkflowManager {
    private readonly _workflows;
    private readonly _templates;
    add(workflow: Workflow): Workflow;
    get(workflowId: string): Workflow | undefined;
    listRunning(): Workflow[];
    listByChannel(channelId: string): Workflow[];
    saveTemplate(name: string, workflow: Workflow): void;
    createFromTemplate(templateName: string): Workflow | undefined;
    getStats(): {
        total: number;
        running: number;
        completed: number;
        failed: number;
        templates: number;
    };
}
//# sourceMappingURL=workflow.d.ts.map