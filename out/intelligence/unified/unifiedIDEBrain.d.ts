export interface ExecutionRequest {
    id: string;
    type: 'goal' | 'task' | 'question' | 'command';
    content: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, unknown>;
}
export interface ExecutionDecision {
    id: string;
    action: 'execute' | 'ask_user' | 'decompose' | 'block' | 'defer';
    confidence: number;
    reasoning: string;
    requiredInfo?: string[];
    autonomyScore: number;
}
export interface BrainState {
    currentGoal: string | null;
    executingTasks: string[];
    queuedTasks: string[];
    systemHealth: number;
    autonomyLevel: number;
    lastUpdate: number;
}
/**
 * UnifiedIDEBrain - Central orchestration hub for Sinter AI 5.0
 * Integrates all 16 intelligence systems + autonomy layer
 * Routes execution through intelligent decision pipeline
 */
export declare class UnifiedIDEBrain {
    private orchestrator;
    private runtimeAgent;
    private autonomyController;
    private goalDecomposition;
    private worldModel;
    private learningEngine;
    private analyticsEngine;
    private state;
    private executionQueue;
    private decisionHistory;
    constructor(projectRoot: string);
    private initialize;
    /**
     * Process user goal through unified pipeline
     * Routes through decomposition, prioritization, autonomy check, execution
     */
    processGoal(goal: string): Promise<{
        decision: ExecutionDecision;
        result?: unknown;
        questionsForUser?: string[];
    }>;
    /**
     * Answer user question and continue execution
     */
    answerQuestion(requestId: string, answer: string): Promise<{
        decision: ExecutionDecision;
        result?: unknown;
    }>;
    /**
     * Queue a task for execution
     */
    queueTask(task: ExecutionRequest): void;
    /**
     * Process next task in queue
     */
    processNextTask(): Promise<ExecutionDecision | null>;
    /**
     * Get current brain state
     */
    getState(): BrainState;
    /**
     * Adjust autonomy level
     */
    setAutonomyLevel(level: number): void;
    /**
     * Get analytics and insights
     */
    getAnalytics(): any;
    /**
     * Shutdown gracefully
     */
    shutdown(): Promise<void>;
}
export default UnifiedIDEBrain;
