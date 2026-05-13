import { ExecutionStep, NarrativeEvent } from '../../types/agent';
export declare class NarrativeGenerator {
    private narrativeTemplates;
    generateNarrativeEvent(step: ExecutionStep, stepNumber: number, totalSteps: number): NarrativeEvent;
    generateCompleteNarrative(steps: ExecutionStep[]): string;
    generateSuccessNarrative(stepCount: number, duration: number): string;
    generateErrorNarrative(step: ExecutionStep, error: string): string;
    generateRecoveryNarrative(attempt: number): string;
    generateProgressSummary(completedSteps: number, totalSteps: number, currentStep: string): string;
    generateRecommendation(context: string): string;
    private generateNarrative;
    private formatDuration;
}
export declare const globalNarrativeGenerator: NarrativeGenerator;
