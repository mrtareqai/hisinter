/**
 * Adaptive context optimizer
 * Intelligently manages context size and relevance for maximum efficiency
 */
export interface ContextWindowAnalysis {
    totalTokens: number;
    usagePercentage: number;
    redundancy: number;
    relevanceScore: number;
    recommendations: string[];
}
export declare class ContextOptimizer {
    private tokenEstimator;
    private minRelevance;
    private contextHistory;
    analyzeContext(context: string, maxTokens: number): ContextWindowAnalysis;
    compressContext(context: string, targetTokens: number): string;
    private calculateRedundancy;
    private estimateRelevance;
    private removeRedundantLines;
    private summarizeLargeBlocks;
    private extractKeyInformation;
    private generateRecommendations;
    recordContextUsage(context: string): void;
    getContextTrends(): {
        avgSize: number;
        maxSize: number;
        growth: number;
    };
}
export declare const globalContextOptimizer: ContextOptimizer;
