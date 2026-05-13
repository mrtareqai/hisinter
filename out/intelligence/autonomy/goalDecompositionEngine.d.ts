export interface Goal {
    id: string;
    title: string;
    description: string;
    complexity: 'atomic' | 'simple' | 'moderate' | 'complex';
    estimatedEffort: number;
    requiredResources: string[];
    dependencies: string[];
    riskLevel: 'low' | 'medium' | 'high';
    successCriteria: string[];
    tags: string[];
    parent?: string;
    children: string[];
}
export interface GoalTree {
    root: Goal;
    allGoals: Map<string, Goal>;
    executionOrder: string[];
    criticalPath: string[];
    totalEstimatedEffort: number;
    overallComplexity: 'atomic' | 'simple' | 'moderate' | 'complex';
}
export default class GoalDecompositionEngine {
    private goalCounter;
    private complexityThresholds;
    /**
     * Decompose a high-level goal into atomic sub-goals
     */
    decompose(userGoal: string): GoalTree;
    /**
     * Recursively decompose a goal until all are atomic
     */
    private decomposeRecursive;
    /**
     * Generate sub-goals for a given goal
     */
    private generateSubGoals;
    /**
     * Analyze goal complexity
     */
    private analyzeComplexity;
    /**
     * Determine complexity from estimated effort
     */
    private determineComplexity;
    /**
     * Create a goal with default values
     */
    private createGoal;
    /**
     * Topological sort: return goals in dependency order
     */
    private topologicalSort;
    /**
     * Find the critical path (longest chain of dependencies)
     */
    private findCriticalPath;
    /**
     * Get goal by ID
     */
    getGoal(tree: GoalTree, goalId: string): Goal | undefined;
    /**
     * Mark goal as completed
     */
    markCompleted(tree: GoalTree, goalId: string): void;
    /**
     * Get remaining goals
     */
    getRemainingGoals(tree: GoalTree): Goal[];
    /**
     * Calculate progress percentage
     */
    getProgress(tree: GoalTree): {
        completed: number;
        total: number;
        percentage: number;
    };
}
