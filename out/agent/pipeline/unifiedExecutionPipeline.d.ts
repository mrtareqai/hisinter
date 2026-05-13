import UnifiedIDEBrain from '../core/unifiedIDEBrain';
import IntelligenceHubIntegration from '../core/intelligenceHubIntegration';
/**
 * UnifiedExecutionPipeline
 * Single execution flow: Intent → Analysis → Decomposition → Prioritization
 * → Conflict Resolution → Confidence Decision → Execute/Ask/Block → Feedback
 */
export declare class UnifiedExecutionPipeline {
    private brain;
    private hubIntegration;
    private narrativeEngine;
    private pipelineId;
    private executionLog;
    constructor(brain: UnifiedIDEBrain, hubIntegration: IntelligenceHubIntegration);
    /**
     * Execute full pipeline from user input to completion
     */
    executePipeline(userInput: string): Promise<{
        success: boolean;
        results: any[];
        narrative: string[];
        executionTime: number;
    }>;
    /**
     * Execute single goal with minimal oversight
     */
    executeGoal(goalId: string, goalDescription: string): Promise<{
        success: boolean;
        output: string;
        narrative: string;
    }>;
    /**
     * Stream execution results in real-time
     */
    streamExecution(userInput: string): AsyncGenerator<{
        stage: string;
        data: any;
        narrative: string;
    }>;
    /**
     * Log pipeline stage
     */
    private logStage;
    /**
     * Get execution log
     */
    getExecutionLog(): Array<{
        timestamp: number;
        stage: string;
        data: any;
    }>;
    /**
     * Clear log
     */
    clearLog(): void;
}
export default UnifiedExecutionPipeline;
