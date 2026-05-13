import { ExecutionFeedback } from './feedbackCollector';
import { ValidationResult } from './validationOrchestrator';
/**
 * Learning data structure to update intelligence systems
 */
export interface LearningUpdate {
    id: string;
    timestamp: number;
    sourceType: 'success' | 'failure' | 'anomaly';
    pattern: {
        toolName: string;
        inputSignature: string;
        outcomePattern: string;
        confidence: number;
    };
    impact: {
        affectedSystems: string[];
        predictionAccuracyDelta: number;
        performanceDelta: number;
    };
    applicableContext: {
        projectType?: string;
        complexity?: string;
        constraints?: string[];
    };
}
/**
 * LearningEngine processes validated feedback to update intelligence systems
 */
export declare class LearningEngine {
    private learningHistory;
    private modelUpdates;
    private readonly persistencePath;
    private readonly maxLearningItems;
    constructor(persistencePath?: string);
    /**
     * Process validated feedback to generate learning updates
     */
    processValidatedFeedback(feedback: ExecutionFeedback, validation: ValidationResult): Promise<LearningUpdate | null>;
    /**
     * Batch process multiple validated feedbacks
     */
    processBatchValidatedFeedback(feedbacks: ExecutionFeedback[], validations: ValidationResult[]): Promise<LearningUpdate[]>;
    /**
     * Update prediction model with new learning
     */
    updatePredictionModel(update: LearningUpdate): Promise<void>;
    /**
     * Update performance prediction model
     */
    updatePerformanceModel(feedback: ExecutionFeedback, update: LearningUpdate): Promise<void>;
    /**
     * Generate learning summary for intelligence systems
     */
    generateLearningSummary(): {
        totalLearning: number;
        successPatterns: LearningUpdate[];
        failurePatterns: LearningUpdate[];
        anomalies: LearningUpdate[];
        modelImprovements: Map<string, number>;
    };
    /**
     * Get applicable learning for a specific context
     */
    getApplicableLearning(context: {
        toolName: string;
        projectType?: string;
        complexity?: string;
    }): LearningUpdate[];
    /**
     * Export models for integration with other systems
     */
    exportModels(): Record<string, any>;
    /**
     * Private helper methods
     */
    private determineSourceType;
    private extractPattern;
    private estimateImpact;
    private getAffectedSystems;
    private extractContext;
    private extractConstraints;
    private persistLearning;
    private initializePersistence;
    getHistorySize(): number;
    clearHistory(): void;
}
