export interface ContextElement {
    id: string;
    type: 'file' | 'function' | 'class' | 'variable' | 'config';
    name: string;
    content: string;
    lineCount: number;
    lastModified: number;
}
export interface RelevanceScore {
    elementId: string;
    score: number;
    reasons: string[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimatedTokenCost: number;
}
export declare class ContextScoringSystem {
    private elementCache;
    private queryCache;
    calculateRelevance(query: string, elements: ContextElement[]): RelevanceScore[];
    private computeRelevanceScore;
    private prioritizeElement;
    private getRelevanceReasons;
    private estimateTokenCost;
    pruneContext(scores: RelevanceScore[], maxTokens: number): RelevanceScore[];
    getTopRelevantElements(scores: RelevanceScore[], limit?: number): RelevanceScore[];
    analyzeContextQuality(scores: RelevanceScore[]): {
        coverage: number;
        clarity: number;
        efficiency: number;
        recommendations: string[];
    };
    registerElement(element: ContextElement): void;
    getElement(id: string): ContextElement | undefined;
}
export default ContextScoringSystem;
