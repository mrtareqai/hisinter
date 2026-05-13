"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionAdapter = void 0;
class ExecutionAdapter {
    toolRegistry;
    constructor(toolRegistry) {
        this.toolRegistry = toolRegistry;
    }
    /**
     * Translate an intelligence output into executable tool calls
     */
    async executeIntelligenceOutput(output, prediction) {
        const startTime = Date.now();
        const context = {
            predictionId: prediction.id,
            toolName: output.recommendedTool,
            arguments: output.toolArguments,
            expectedOutcome: output.expectedOutcome,
            confidence: prediction.confidence,
            timestamp: startTime,
        };
        try {
            const result = await this.toolRegistry.execute(output.recommendedTool, output.toolArguments);
            const executionTime = Date.now() - startTime;
            const actualOutcome = this.normalizeOutcome(result);
            const feedbackRelevance = this.calculateFeedbackRelevance(prediction, result, executionTime);
            return {
                context,
                result,
                actualOutcome,
                success: result.success,
                executionTime,
                feedbackRelevance,
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const errorResult = {
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
    async executeSequence(outputs, predictions) {
        const records = [];
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
    normalizeOutcome(result) {
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
    calculateFeedbackRelevance(prediction, result, executionTime) {
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
    isCriticalFailure(record) {
        const output = record.result.output.toLowerCase();
        return (output.includes('permission denied') ||
            output.includes('critical') ||
            output.includes('fatal') ||
            output.includes('unauthorized'));
    }
    /**
     * Batch execute multiple intelligence outputs in parallel
     */
    async executeBatch(outputs, predictions) {
        const promises = outputs.map((output, index) => this.executeIntelligenceOutput(output, predictions[index]));
        return Promise.all(promises);
    }
}
exports.ExecutionAdapter = ExecutionAdapter;
//# sourceMappingURL=executionAdapter.js.map