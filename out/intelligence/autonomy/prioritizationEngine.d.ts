import { Goal } from './goalDecompositionEngine';
export interface Priority {
    goalId: string;
    score: number;
    factors: {
        impact: number;
        urgency: number;
        cost: number;
        complexity: number;
        dependencies: number;
    };
    reasoning: string;
}
export interface PrioritizationHistory {
    timestamp: number;
    decisions: Priority[];
    userFeedback?: {
        confirmed: boolean;
        adjustments: Record<string, number>;
    };
}
export default class PrioritizationEngine {
    private history;
    private weights;
    private learningRate;
    /**
     * Prioritize goals based on multiple factors
     */
    prioritize(goals: Goal[], executionOrder: string[]): Priority[];
    /**
     * Calculate individual priority factors for a goal
     */
    private calculateFactors;
    /**
     * Calculate composite priority score
     */
    private calculateScore;
    /**
     * Generate human-readable reasoning for priority
     */
    private generateReasoning;
    /**
     * Get recommended execution queue
     */
    getExecutionQueue(priorities: Priority[]): string[];
    /**
     * Adjust weights based on user feedback
     */
    learnFromFeedback(feedback: Record<string, number>, confidence?: number): void;
    /**
     * Get priority statistics
     */
    getStatistics(): {
        averageScore: number;
        scoreVariance: number;
        mostFrequentlyHighPriority: string;
        avgPrioritizationTime: number;
        decisionCount: number;
    };
    /**
     * Detect priority conflicts or anomalies
     */
    detectAnomalies(currentPriorities: Priority[], previousPriorities?: Priority[]): {
        shiftedRanking: Array<{
            goalId: string;
            oldRank: number;
            newRank: number;
        }>;
        scoreOutliers: Priority[];
        inconsistencies: string[];
    };
    /**
     * Export prioritization history for analytics
     */
    getHistory(): PrioritizationHistory[];
    /**
     * Clear history (for testing or reset)
     */
    clearHistory(): void;
    /**
     * Get weight configuration
     */
    getWeights(): typeof this.weights;
    /**
     * Set weight configuration
     */
    setWeights(weights: Partial<typeof this.weights>): void;
}
