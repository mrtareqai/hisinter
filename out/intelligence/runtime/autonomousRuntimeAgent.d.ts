import { IntelligenceOrchestrator } from '../orchestrator/intelligenceOrchestrator';
import { ToolRegistry } from '../../tools/toolRegistry';
/**
 * Execution cycle metrics
 */
export interface ExecutionCycleMetrics {
    cycleId: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    executionRecords: number;
    feedbackCollected: number;
    feedbackValidated: number;
    learningUpdates: number;
    successRate: number;
}
/**
 * AutonomousRuntimeAgent orchestrates the complete execution-feedback-learning loop
 */
export declare class AutonomousRuntimeAgent {
    private executionAdapter;
    private feedbackCollector;
    private validationOrchestrator;
    private learningEngine;
    private filesystemMonitor;
    private terminalExecutor;
    private vscodeAdapter;
    private intelligenceOrchestrator;
    private cycleMetrics;
    private isRunning;
    private cycleCallbacks;
    constructor(toolRegistry: ToolRegistry, intelligenceOrchestrator: IntelligenceOrchestrator, workspacePath?: string);
    /**
     * Start autonomous execution loop
     */
    startAutonomousLoop(): Promise<void>;
    /**
     * Stop autonomous loop
     */
    stopAutonomousLoop(): Promise<void>;
    /**
     * Execute a single complete cycle: Predict → Execute → Collect → Validate → Learn
     */
    executeCycle(taskDescription: string): Promise<ExecutionCycleMetrics>;
    /**
     * Continuous execution loop
     */
    private continuousExecutionCycle;
    /**
     * Get system state snapshot
     */
    getSystemState(): {
        isRunning: boolean;
        cyclesCompleted: number;
        totalExecutions: number;
        averageSuccessRate: number;
        filesystemState: Record<string, any>;
        terminalMetrics: any;
        editorState: any;
    };
    /**
     * Get learning summary
     */
    getLearningProgress(): {
        totalLearned: number;
        successPatterns: number;
        failurePatterns: number;
        modelImprovements: Record<string, number>;
    };
    /**
     * Execute a specific command via terminal
     */
    executeTerminalCommand(command: string, onOutput?: (output: string) => void): Promise<any>;
    /**
     * Get execution cycle history
     */
    getCycleHistory(limit?: number): ExecutionCycleMetrics[];
    /**
     * Register cycle completion callback
     */
    onCycleComplete(callback: (cycle: ExecutionCycleMetrics) => void): void;
    /**
     * Private helper methods
     */
    private emitCycleComplete;
    private delay;
    /**
     * Export agent state for persistence
     */
    exportState(): {
        cycleHistory: ExecutionCycleMetrics[];
        learningProgress: any;
        systemState: any;
    };
}
