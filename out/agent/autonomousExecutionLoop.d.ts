/**
 * Autonomous Execution Loop - Self-correcting task execution
 *
 * Core cycle: Plan → Execute → Observe → Recover
 *
 * This system enables fully autonomous task execution with automatic
 * error detection and recovery. Tasks are executed in phases with
 * continuous feedback and self-correction.
 */
/**
 * Execution plan with steps
 */
export interface ExecutionPlan {
    id: string;
    taskDescription: string;
    steps: ExecutionStep[];
    strategy: string;
    estimatedDuration: number;
    confidence: number;
}
/**
 * Individual execution step
 */
export interface ExecutionStep {
    id: string;
    description: string;
    action: string;
    expectedOutput?: string;
    timeout: number;
    retryable: boolean;
    index: number;
}
/**
 * Result from executing a step
 */
export interface StepResult {
    stepId: string;
    success: boolean;
    output?: any;
    error?: Error;
    duration: number;
    attempts: number;
}
/**
 * All results from executing a plan
 */
export interface StepResults {
    planId: string;
    steps: StepResult[];
    totalDuration: number;
    successCount: number;
    failureCount: number;
    overallSuccess: boolean;
}
/**
 * Observation from analyzing execution results
 */
export interface Observation {
    success: boolean;
    issues: ExecutionIssue[];
    insights: string[];
    confidence: number;
}
/**
 * Issue detected during observation
 */
export interface ExecutionIssue {
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    stepIndex: number;
    suggestedRecovery: string;
}
/**
 * Complete execution cycle state
 */
export interface ExecutionCycle {
    id: string;
    taskDescription: string;
    phase: 'planning' | 'executing' | 'observing' | 'recovering' | 'complete';
    plan?: ExecutionPlan;
    results?: StepResults;
    observations?: Observation[];
    recoveryAttempts: number;
    maxRecoveryAttempts: number;
    status: 'running' | 'completed' | 'failed' | 'recovered';
    startTime: number;
    endTime?: number;
}
export declare class AutonomousExecutionLoop {
    private cycles;
    private maxRecoveryAttempts;
    constructor();
    /**
     * Run a complete execution cycle: Plan → Execute → Observe → Recover
     */
    runExecutionCycle(taskDescription: string): Promise<{
        success: boolean;
        output?: any;
    }>;
    /**
     * Phase 1: Planning - analyze task and create execution plan
     */
    private planPhase;
    /**
     * Phase 2: Execute - run all steps in the plan
     */
    private executeSteps;
    /**
     * Execute a single step with retry logic
     */
    private executeStep;
    /**
     * Phase 3: Observe - analyze results and identify issues
     */
    private observeResults;
    /**
     * Phase 4: Recovery - attempt to fix issues and continue
     */
    private recoverFromIssues;
    /**
     * Get execution cycle
     */
    getCycle(cycleId: string): ExecutionCycle | undefined;
    /**
     * Get all cycles
     */
    getAllCycles(): ExecutionCycle[];
    /**
     * Get recent cycles
     */
    getRecentCycles(count?: number): ExecutionCycle[];
    /**
     * Get execution statistics
     */
    getStatistics(): {
        totalCycles: number;
        completed: number;
        failed: number;
        successRate: number;
        averageDuration: number;
        totalRecoveries: number;
    };
    /**
     * Private: Simulate step execution
     */
    private simulateStepExecution;
    /**
     * Private: Create a timeout promise
     */
    private createTimeout;
    /**
     * Cleanup on dispose
     */
    dispose(): void;
}
export declare let globalExecutionLoop: AutonomousExecutionLoop;
/**
 * Initialize global execution loop
 */
export declare function initializeGlobalExecutionLoop(): AutonomousExecutionLoop;
