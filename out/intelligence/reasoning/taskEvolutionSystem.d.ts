export interface TaskMetrics {
    complexity: number;
    difficulty: number;
    estimatedDuration: number;
    actualDuration: number;
    successRate: number;
    retries: number;
}
export interface TaskEvolution {
    taskId: string;
    initialComplexity: number;
    currentComplexity: number;
    strategy: 'direct' | 'iterative' | 'decomposed' | 'experimental';
    performanceHistory: TaskMetrics[];
    adaptations: Array<{
        timestamp: number;
        reason: string;
        newStrategy: string;
    }>;
    learnings: string[];
}
export declare class TaskEvolutionSystem {
    private taskEvolutions;
    private strategyScores;
    initializeTask(taskId: string, initialComplexity: number): TaskEvolution;
    private selectInitialStrategy;
    recordTaskMetrics(taskId: string, metrics: TaskMetrics): void;
    private updateDifficulty;
    private checkAndAdaptStrategy;
    private recordLearning;
    getTaskEvolution(taskId: string): TaskEvolution | undefined;
    getPerformanceTrend(taskId: string): 'improving' | 'stable' | 'degrading';
    suggestOptimization(taskId: string): string | null;
    getAllEvolutions(): TaskEvolution[];
    getStrategyScores(): Record<string, number>;
}
export default TaskEvolutionSystem;
