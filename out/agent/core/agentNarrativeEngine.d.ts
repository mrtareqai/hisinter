/**
 * AgentNarrativeEngine
 * Generates unified, coherent narrative for all agent operations
 * No panel-switching language, single seamless story
 */
export declare class AgentNarrativeEngine {
    private narrativeHistory;
    private narrativeTemplates;
    constructor();
    /**
     * Generate thinking narrative
     */
    generateThinkingNarrative(input: string): string;
    /**
     * Generate decomposition narrative
     */
    generateDecomposedNarrative(steps: string[], priorities: any[]): string;
    /**
     * Generate question narrative
     */
    generateQuestionNarrative(question: string): string;
    /**
     * Generate execution narrative
     */
    generateExecutionNarrative(step: string, estimatedDuration: number): string;
    /**
     * Generate tool selection narrative
     */
    generateToolNarrative(tool: string, task: string): string;
    /**
     * Generate progress narrative
     */
    generateProgressNarrative(completed: number, total: number, status: string): string;
    /**
     * Generate success narrative
     */
    generateSuccessNarrative(task: string, result: string): string;
    /**
     * Generate error narrative with recovery
     */
    generateErrorNarrative(error: string): string;
    /**
     * Generate completion narrative
     */
    generateCompletionNarrative(summary: any): string;
    /**
     * Generate learning narrative
     */
    generateLearningNarrative(insight: string, improvementPercent: number): string;
    /**
     * Record narrative for history
     */
    recordNarrative(stage: string, narrative: string, metadata?: any): void;
    /**
     * Get full narrative arc
     */
    getNarrativeArc(): Array<{
        stage: string;
        narrative: string;
    }>;
    /**
     * Get recent narratives
     */
    getRecentNarratives(limit?: number): string[];
    /**
     * Clear history
     */
    clearHistory(): void;
    /**
     * Helper: interpolate variables in templates
     */
    private interpolate;
    /**
     * Helper: escape quotes in strings
     */
    private escapeQuotes;
    /**
     * Generate full conversation context
     */
    getConversationContext(): {
        currentNarrative: string;
        history: string[];
        stage: string;
    };
}
export default AgentNarrativeEngine;
