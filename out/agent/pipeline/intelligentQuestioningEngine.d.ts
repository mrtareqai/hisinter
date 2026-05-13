/**
 * IntelligentQuestioningEngine
 * Generates minimal, context-aware clarification questions
 * Only asks when truly necessary (gap analysis)
 */
export declare class IntelligentQuestioningEngine {
    private questionHistory;
    private questionTemplates;
    constructor();
    /**
     * Analyze goal decomposition for gaps
     */
    detectGaps(goalTree: any): Array<{
        type: string;
        severity: 'critical' | 'moderate' | 'minor';
        question?: string;
    }>;
    /**
     * Generate minimal questions from gaps
     */
    generateMinimalQuestions(gaps: any[], goalTree: any): string[];
    /**
     * Generate specific question for gap
     */
    private generateQuestionForGap;
    /**
     * Ask user a question and record response
     */
    askQuestion(question: string, context?: any): Promise<{
        question: string;
        answer: string;
        confidence: number;
    }>;
    /**
     * List available frameworks for language
     */
    private listFrameworks;
    /**
     * Check if questions were already asked and answered
     */
    getAnsweredContext(): Record<string, string>;
    /**
     * Parse question type from question text
     */
    private parseQuestionType;
    /**
     * Should ask for clarification?
     */
    shouldAsk(gaps: any[]): boolean;
    /**
     * Get question history
     */
    getQuestionHistory(): Array<{
        timestamp: number;
        question: string;
        answer?: string;
    }>;
    /**
     * Interpolate variables in templates
     */
    private interpolate;
    /**
     * Clear history
     */
    clearHistory(): void;
}
export default IntelligentQuestioningEngine;
