export interface PerformanceMetrics {
    complexity: number;
    expectedDuration: number;
    memoryEstimate: number;
    cpuUsage: number;
    ioOperations: number;
    networkCalls: number;
}
export interface ExecutionPrediction {
    taskId: string;
    metrics: PerformanceMetrics;
    predictedDuration: number;
    predictedSuccess: number;
    bottlenecks: string[];
    optimizations: string[];
    confidence: number;
}
export declare class PerformancePredictor {
    private executionData;
    private complexityModel;
    predictExecution(taskId: string, metrics: PerformanceMetrics): ExecutionPrediction;
    private predictDuration;
    private predictSuccessRate;
    private identifyBottlenecks;
    private suggestOptimizations;
    private calculateConfidence;
    recordExecution(taskId: string, metrics: PerformanceMetrics, actualDuration: number, success: boolean): void;
    getExecutionHistory(limit?: number): typeof this.executionData;
    getAccuracyMetrics(): {
        meanErrorPercent: number;
        predictions: number;
        trend: 'improving' | 'stable' | 'degrading';
    };
}
export default PerformancePredictor;
