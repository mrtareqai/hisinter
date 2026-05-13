import { RuntimeExecutionState } from './hybridModelRuntime';
export type TaskStatus = 'pending' | 'running' | 'validating' | 'completed' | 'failed' | 'blocked' | 'retrying';
export interface RuntimeTask {
    id: string;
    title: string;
    scope: string[];
    status: TaskStatus;
    attempts: number;
    createdAt: number;
    updatedAt: number;
    lastError?: string;
    validationSummary?: string;
}
export interface FailureRecord {
    taskId: string;
    signature: string;
    message: string;
    strategy: string;
    timestamp: number;
}
export interface RuntimeCheckpoint {
    id: string;
    label: string;
    taskIds: string[];
    timestamp: number;
    summary: string;
}
export interface GoalStateSnapshot {
    goal: string;
    progress: number;
    executionState: RuntimeExecutionState;
    completed: number;
    failed: number;
    pending: number;
    retryCount: number;
    tasks: RuntimeTask[];
    failures: FailureRecord[];
    checkpoints: RuntimeCheckpoint[];
    recentEvents: string[];
}
export declare class AutonomousRuntimeState {
    private goal;
    private executionState;
    private tasks;
    private failures;
    private checkpoints;
    private recentEvents;
    private signatures;
    startGoal(goal: string): RuntimeTask;
    setExecutionState(state: RuntimeExecutionState): void;
    addTask(title: string, scope?: string[]): RuntimeTask;
    currentTask(): RuntimeTask | undefined;
    startTask(taskId?: string): RuntimeTask | undefined;
    markValidating(taskId?: string): void;
    completeTask(summary: string, taskId?: string): void;
    failTask(message: string, taskId?: string): void;
    markRetry(strategy: string, taskId?: string): void;
    pauseTask(reason: string, taskId?: string): void;
    resumeTask(taskId?: string): RuntimeTask | undefined;
    recordFailure(taskId: string, signature: string, message: string, strategy: string): void;
    createCheckpoint(label: string, summary: string): RuntimeCheckpoint;
    detectLoop(signature: string): boolean;
    getRetryGuidance(): string;
    snapshot(): GoalStateSnapshot;
    buildPromptContext(): string;
    private addEvent;
    private titleFromGoal;
}
