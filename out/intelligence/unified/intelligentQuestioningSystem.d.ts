import ProjectWorldModel from '../autonomy/projectWorldModel';
export interface Question {
    id: string;
    text: string;
    type: 'clarification' | 'confirmation' | 'choice' | 'input';
    options?: string[];
    importance: number;
    category: string;
}
export interface QuestioningContext {
    goal: string;
    missingInfo: string[];
    riskFactors: string[];
    dependencies: string[];
    ambiguities: string[];
}
/**
 * IntelligentQuestioningSystem - Minimal questions for maximum clarity
 * Asks only essential questions when confidence is 70-85%
 */
export declare class IntelligentQuestioningSystem {
    private worldModel;
    private questionCache;
    constructor(worldModel: ProjectWorldModel);
    /**
     * Generate minimal questions for a goal
     */
    generateQuestions(goal: string, confidence: number): Question[];
    /**
     * Analyze goal to understand what's missing
     */
    private analyzeGoal;
    /**
     * Construct minimal set of critical questions
     */
    private constructMinimalQuestions;
    /**
     * Prioritize questions by importance and risk
     */
    prioritizeQuestions(questions: Question[]): Question[];
    /**
     * Format questions for user display
     */
    formatForDisplay(questions: Question[]): string;
    /**
     * Process user answers
     */
    processAnswers(answers: Map<string, string>): {
        clarifications: Record<string, string>;
        risks: Record<string, string>;
        confidence: number;
    };
}
export default IntelligentQuestioningSystem;
