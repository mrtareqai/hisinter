import { ExecutionFeedback } from './feedbackCollector';
/**
 * Validation rules that feedback must pass
 */
export interface ValidationRule {
    name: string;
    description: string;
    validate: (feedback: ExecutionFeedback) => boolean;
    severity: 'critical' | 'warning' | 'info';
}
/**
 * Validation result with detailed information
 */
export interface ValidationResult {
    feedbackId: string;
    isValid: boolean;
    passedRules: ValidationRule[];
    failedRules: ValidationRule[];
    validationScore: number;
    recommendations: string[];
    timestamp: number;
}
/**
 * ValidationOrchestrator validates feedback quality before learning
 */
export declare class ValidationOrchestrator {
    private rules;
    private validationHistory;
    constructor();
    /**
     * Validate a single feedback item
     */
    validateFeedback(feedback: ExecutionFeedback): Promise<ValidationResult>;
    /**
     * Batch validate multiple feedback items
     */
    validateBatch(feedbacks: ExecutionFeedback[]): Promise<ValidationResult[]>;
    /**
     * Add custom validation rule
     */
    addRule(rule: ValidationRule): void;
    /**
     * Get validation statistics
     */
    getValidationStats(): {
        totalValidated: number;
        validFeedback: number;
        invalidFeedback: number;
        averageScore: number;
        criticalFailures: number;
    };
    /**
     * Private helper methods
     */
    private initializeDefaultRules;
    private generateRecommendations;
}
