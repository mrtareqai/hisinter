export interface ExecutionPath {
    id: string;
    steps: string[];
    expectedDuration: number;
    costFactor: number;
    successProbability: number;
    complexity: number;
}
export interface OptimizationResult {
    originalPath: ExecutionPath;
    optimizedPath: ExecutionPath;
    improvement: {
        timeSaved: number;
        costSaved: number;
        successIncrease: number;
        complexityReduction: number;
    };
    optimizationStrategy: string;
    recommendation: string;
}
export declare class ExecutionOptimizer {
    private pathHistory;
    private optimizationPatterns;
    optimizeExecutionPath(originalPath: ExecutionPath): OptimizationResult;
    private generateOptimizedPath;
    private parallelizeSteps;
    private identifyParallelizableSteps;
    private mergeParallelSteps;
    private removeRedundancy;
    private reorderForEfficiency;
    private batchOperations;
    private calculateOptimizedDuration;
    private calculateOptimizedCost;
    private calculateOptimizedSuccess;
    private calculateComplexity;
    private calculateImprovement;
    private selectOptimizationStrategy;
    private generateRecommendation;
    recordPathExecution(path: ExecutionPath, actualDuration: number, actualCost: number, success: boolean): void;
    getOptimizationPatterns(): Record<string, {
        avgImprovement: number;
        frequency: number;
    }>;
    getExecutionPathStatistics(): {
        averagePathLength: number;
        successRate: number;
        averageImprovement: number;
    };
}
export default ExecutionOptimizer;
