export interface ReasoningStep {
    stepNumber: number;
    thought: string;
    assumptions: string[];
    alternatives: string[];
    confidence: number;
    reasoning: string;
}
export interface ReasoningChain {
    goal: string;
    steps: ReasoningStep[];
    conclusion: string;
    finalConfidence: number;
    hypothesis: string;
    hypothesisValidation: boolean;
    timestamp: number;
}
export declare class DeepReasoningEngine {
    private reasoningHistory;
    executeChainOfThought(goal: string, context: Record<string, any>): Promise<ReasoningChain>;
    private generateHypothesis;
    private validateAssumptions;
    private analyzeAlternatives;
    private synthesizeConclusion;
    private calculateFinalConfidence;
    testHypothesis(hypothesis: string, evidence: Record<string, any>): {
        valid: boolean;
        confidence: number;
        explanation: string;
    };
    getReasoningHistory(limit?: number): ReasoningChain[];
    getLastReasoning(): ReasoningChain | null;
}
export default DeepReasoningEngine;
