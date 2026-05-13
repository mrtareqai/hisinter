import { ExecutionRequest, ExecutionDecision } from './unifiedIDEBrain';
import UnifiedIDEBrain from './unifiedIDEBrain';
import IntelligentQuestioningSystem from './intelligentQuestioningSystem';
import ProjectGenerationEngine from './projectGenerationEngine';
export interface PipelineStage {
    name: string;
    execute: (input: unknown) => Promise<unknown>;
    condition?: (input: unknown) => boolean;
}
export interface PipelineContext {
    requestId: string;
    originalRequest: ExecutionRequest;
    currentStage: string;
    stageResults: Map<string, unknown>;
    userInputs: Map<string, string>;
    startTime: number;
    estimatedDuration: number;
}
/**
 * UnifiedExecutionPipeline - Routes requests through intelligent decision pipeline
 * Stages: Analyze → Ask Questions → Decompose → Prioritize → Decide → Execute
 */
export declare class UnifiedExecutionPipeline {
    private brain;
    private questioningSystem;
    private projectGenerator;
    private pipelines;
    private contexts;
    constructor(brain: UnifiedIDEBrain, questioningSystem: IntelligentQuestioningSystem, projectGenerator: ProjectGenerationEngine);
    private setupPipelines;
    /**
     * Execute request through appropriate pipeline
     */
    execute(request: ExecutionRequest): Promise<{
        result: unknown;
        questionsForUser?: string[];
        decision?: ExecutionDecision;
        duration: number;
    }>;
    /**
     * Get pipeline context
     */
    getContext(requestId: string): PipelineContext | undefined;
    /**
     * Get all active contexts
     */
    getActiveContexts(): PipelineContext[];
    /**
     * Cancel execution
     */
    cancel(requestId: string): void;
}
export default UnifiedExecutionPipeline;
