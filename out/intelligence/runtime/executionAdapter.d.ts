import { ToolRegistry, ToolResult } from '../../tools/toolRegistry';
import { IntelligenceOutput, ExecutionPrediction } from '../types/intelligenceTypes';
/**
 * ExecutionAdapter bridges Intelligence outputs to real tool execution
 * Translates intelligence decisions into concrete tool invocations
 */
export interface ExecutionContext {
    predictionId: string;
    toolName: string;
    arguments: Record<string, unknown>;
    expectedOutcome?: string;
    confidence: number;
    timestamp: number;
}
export interface ExecutionRecord {
    context: ExecutionContext;
    result: ToolResult;
    actualOutcome: string;
    success: boolean;
    executionTime: number;
    feedbackRelevance: number;
}
export declare class ExecutionAdapter {
    private toolRegistry;
    constructor(toolRegistry: ToolRegistry);
    /**
     * Translate an intelligence output into executable tool calls
     */
    executeIntelligenceOutput(output: IntelligenceOutput, prediction: ExecutionPrediction): Promise<ExecutionRecord>;
    /**
     * Execute multiple tool calls in sequence with dependency tracking
     */
    executeSequence(outputs: IntelligenceOutput[], predictions: ExecutionPrediction[]): Promise<ExecutionRecord[]>;
    /**
     * Normalize tool output to a standard format for feedback
     */
    private normalizeOutcome;
    /**
     * Calculate how useful this execution is for learning
     */
    private calculateFeedbackRelevance;
    /**
     * Determine if a failure requires stopping execution
     */
    private isCriticalFailure;
    /**
     * Batch execute multiple intelligence outputs in parallel
     */
    executeBatch(outputs: IntelligenceOutput[], predictions: ExecutionPrediction[]): Promise<ExecutionRecord[]>;
}
