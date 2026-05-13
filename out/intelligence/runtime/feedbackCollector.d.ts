import { ExecutionRecord } from './executionAdapter';
/**
 * Comprehensive feedback data structure from execution
 */
export interface ExecutionFeedback {
    id: string;
    executionRecordId: string;
    timestamp: number;
    toolName: string;
    inputParameters: Record<string, unknown>;
    outputResult: string;
    success: boolean;
    executionTimeMs: number;
    systemMetrics: {
        memoryUsed: number;
        cpuLoad: number;
        diskIO: string;
    };
    outcomeAnalysis: {
        expectedVsActual: string;
        surpriseFactor: number;
        learningPotential: number;
    };
    environmentState: {
        projectStructure: string;
        fileSystemState: Record<string, string>;
        errorContext: Record<string, unknown>;
    };
    feedbackChain: {
        previousExecutionId?: string;
        dependentExecutionId?: string;
        sequencePosition: number;
    };
}
/**
 * FeedbackCollector captures detailed execution feedback for learning
 */
export declare class FeedbackCollector {
    private feedbackHistory;
    private readonly persistencePath;
    private readonly maxHistorySize;
    constructor(persistencePath?: string);
    /**
     * Collect comprehensive feedback from an execution record
     */
    collectFeedback(record: ExecutionRecord, sequencePosition?: number, previousExecutionId?: string): Promise<ExecutionFeedback>;
    /**
     * Batch collect feedback from multiple execution records
     */
    collectBatchFeedback(records: ExecutionRecord[]): Promise<ExecutionFeedback[]>;
    /**
     * Retrieve feedback by various criteria
     */
    getFeedbackByTool(toolName: string): ExecutionFeedback[];
    getFeedbackBySuccessRate(minSuccess?: number): ExecutionFeedback[];
    getFeedbackByLearningPotential(minPotential?: number): ExecutionFeedback[];
    /**
     * Get recent feedback for a specific time window
     */
    getRecentFeedback(timeWindowMs?: number): ExecutionFeedback[];
    /**
     * Persist feedback to disk for long-term learning
     */
    persistFeedback(feedback: ExecutionFeedback): Promise<void>;
    /**
     * Load feedback from disk
     */
    loadPersistedFeedback(feedbackId: string): Promise<ExecutionFeedback | null>;
    /**
     * Generate feedback summary for analysis
     */
    generateFeedbackSummary(): {
        totalExecutions: number;
        successRate: number;
        averageExecutionTime: number;
        highLearningItems: ExecutionFeedback[];
        failurePatterns: string[];
    };
    /**
     * Private helper methods
     */
    private captureSystemMetrics;
    private compareOutcomes;
    private calculateSurpriseFactor;
    private captureProjectStructure;
    private captureFileSystemState;
    private captureErrorContext;
    private analyzeFailurePatterns;
    private initializePersistence;
    getHistorySize(): number;
    clearHistory(): void;
}
