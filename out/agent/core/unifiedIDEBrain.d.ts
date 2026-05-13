/**
 * UnifiedIDEBrain - Single orchestration point for all IDE operations
 * Integrates all 16 intelligence systems + autonomy layer + multi-agent loop
 * All operations flow through this single brain
 */
export declare class UnifiedIDEBrain {
    private orchestrator;
    private autonomyController;
    private conflictResolver;
    private worldModel;
    private globalState;
    private operationId;
    private callbacks;
    constructor(projectRoot: string);
    /**
     * Process user intent through unified brain
     * Single entry point for all user interactions
     */
    processUserIntent(intent: string): Promise<{
        decision: 'execute' | 'ask' | 'block';
        reasoning: string;
        suggestedActions: string[];
        goals?: any;
        confidence?: number;
    }>;
    /**
     * Execute a single goal with full intelligence support
     */
    executeGoal(goalId: string, goalDescription: string): Promise<{
        success: boolean;
        output: string;
        feedback: any;
        learningSignals: any;
    }>;
    /**
     * Intelligent execution with tool selection and error recovery
     */
    private executeIntelligent;
    /**
     * Execute a single tool
     */
    private executeTool;
    /**
     * Collect feedback from execution
     */
    private collectExecutionFeedback;
    /**
     * Generate learning signals from execution
     */
    private generateLearningSignals;
    /**
     * Register callback for events
     */
    on(event: string, callback: (data: any) => void): void;
    /**
     * Emit event to callbacks
     */
    private emit;
    /**
     * Get system status and health
     */
    getSystemStatus(): {
        brainId: string;
        systems: number;
        autonomyScore: number;
        uptime: number;
        memory: any;
    };
    /**
     * Shutdown brain gracefully
     */
    shutdown(): Promise<void>;
}
export default UnifiedIDEBrain;
