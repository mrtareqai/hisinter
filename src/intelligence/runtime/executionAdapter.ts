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
  feedbackRelevance: number; // 0-1 score for how useful this feedback is
}

export class ExecutionAdapter {
  constructor(private toolRegistry: ToolRegistry) {}

  /**
   * Translate an intelligence output into executable tool calls
   */
  async executeIntelligenceOutput(
    output: IntelligenceOutput,
    prediction: ExecutionPrediction
  ): Promise<ExecutionRecord> {
    const startTime = Date.now();
    const context: ExecutionContext = {
      predictionId: prediction.id,
      toolName: output.recommendedTool,
      arguments: output.toolArguments,
      expectedOutcome: output.expectedOutcome,
      confidence: prediction.confidence,
      timestamp: startTime,
    };

    try {
      const result = await this.toolRegistry.execute(
        output.recommendedTool,
        output.toolArguments
      );

      const executionTime = Date.now() - startTime;
      const actualOutcome = this.normalizeOutcome(result);
      const feedbackRelevance = this.calculateFeedbackRelevance(
        prediction,
        result,
        executionTime
      );

      return {
        context,
        result,
        actualOutcome,
        success: result.success,
        executionTime,
        feedbackRelevance,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorResult: ToolResult = {
        success: false,
        output: error instanceof Error ? error.message : String(error),
      };

      return {
        context,
        result: errorResult,
        actualOutcome: 'ERROR',
        success: false,
        executionTime,
        feedbackRelevance: 0.8, // High relevance for learning from failures
      };
    }
  }

  /**
   * Execute multiple tool calls in sequence with dependency tracking
   */
  async executeSequence(
    outputs: IntelligenceOutput[],
    predictions: ExecutionPrediction[]
  ): Promise<ExecutionRecord[]> {
    const records: ExecutionRecord[] = [];

    for (let i = 0; i < outputs.length; i++) {
      const record = await this.executeIntelligenceOutput(outputs[i], predictions[i]);
      records.push(record);

      // Stop on critical failures
      if (!record.success && this.isCriticalFailure(record)) {
        console.log('[v0] Critical failure detected, halting sequence execution');
        break;
      }
    }

    return records;
  }

  /**
   * Normalize tool output to a standard format for feedback
   */
  private normalizeOutcome(result: ToolResult): string {
    if (!result.success) {
      return `FAILURE: ${result.output}`;
    }

    // Truncate very long outputs for analysis
    const output = result.output.substring(0, 500);
    return `SUCCESS: ${output}`;
  }

  /**
   * Calculate how useful this execution is for learning
   */
  private calculateFeedbackRelevance(
    prediction: ExecutionPrediction,
    result: ToolResult,
    executionTime: number
  ): number {
    let relevance = 0.5;

    // High relevance for unexpected outcomes
    const predictedSuccess = prediction.confidence > 0.7;
    const actualSuccess = result.success;
    if (predictedSuccess !== actualSuccess) {
      relevance += 0.3;
    }

    // High relevance for extreme execution times
    if (executionTime > 5000 || executionTime < 100) {
      relevance += 0.1;
    }

    // High relevance for edge cases or errors
    if (result.output.includes('ENOENT') || result.output.includes('permission')) {
      relevance += 0.2;
    }

    return Math.min(1, relevance);
  }

  /**
   * Determine if a failure requires stopping execution
   */
  private isCriticalFailure(record: ExecutionRecord): boolean {
    const output = record.result.output.toLowerCase();
    return (
      output.includes('permission denied') ||
      output.includes('critical') ||
      output.includes('fatal') ||
      output.includes('unauthorized')
    );
  }

  /**
   * Batch execute multiple intelligence outputs in parallel
   */
  async executeBatch(
    outputs: IntelligenceOutput[],
    predictions: ExecutionPrediction[]
  ): Promise<ExecutionRecord[]> {
    const promises = outputs.map((output, index) =>
      this.executeIntelligenceOutput(output, predictions[index])
    );

    return Promise.all(promises);
  }
}
