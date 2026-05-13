"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationOrchestrator = void 0;
/**
 * ValidationOrchestrator validates feedback quality before learning
 */
class ValidationOrchestrator {
    rules = [];
    validationHistory = [];
    constructor() {
        this.initializeDefaultRules();
    }
    /**
     * Validate a single feedback item
     */
    async validateFeedback(feedback) {
        const passed = [];
        const failed = [];
        for (const rule of this.rules) {
            try {
                if (rule.validate(feedback)) {
                    passed.push(rule);
                }
                else {
                    failed.push(rule);
                }
            }
            catch (error) {
                console.error(`[v0] Validation rule failed: ${rule.name}`, error);
                failed.push(rule);
            }
        }
        const validationScore = passed.length / this.rules.length;
        const isValid = passed.length > 0 &&
            failed.filter((r) => r.severity === 'critical').length === 0;
        const result = {
            feedbackId: feedback.id,
            isValid,
            passedRules: passed,
            failedRules: failed,
            validationScore,
            recommendations: this.generateRecommendations(feedback, failed),
            timestamp: Date.now(),
        };
        this.validationHistory.push(result);
        return result;
    }
    /**
     * Batch validate multiple feedback items
     */
    async validateBatch(feedbacks) {
        return Promise.all(feedbacks.map((f) => this.validateFeedback(f)));
    }
    /**
     * Add custom validation rule
     */
    addRule(rule) {
        this.rules.push(rule);
    }
    /**
     * Get validation statistics
     */
    getValidationStats() {
        const total = this.validationHistory.length;
        const valid = this.validationHistory.filter((r) => r.isValid).length;
        const avgScore = this.validationHistory.reduce((sum, r) => sum + r.validationScore, 0) / total ||
            0;
        const criticalFailures = this.validationHistory.filter((r) => r.failedRules.filter((rule) => rule.severity === 'critical').length > 0).length;
        return {
            totalValidated: total,
            validFeedback: valid,
            invalidFeedback: total - valid,
            averageScore: avgScore,
            criticalFailures,
        };
    }
    /**
     * Private helper methods
     */
    initializeDefaultRules() {
        // Data completeness
        this.addRule({
            name: 'DATA_COMPLETENESS',
            description: 'Feedback must have all required fields',
            validate: (feedback) => {
                return (feedback.id &&
                    feedback.toolName &&
                    feedback.timestamp &&
                    feedback.outputResult);
            },
            severity: 'critical',
        });
        // Execution time plausibility
        this.addRule({
            name: 'EXECUTION_TIME_PLAUSIBLE',
            description: 'Execution time should be reasonable (0ms - 10 minutes)',
            validate: (feedback) => {
                return feedback.executionTimeMs >= 0 && feedback.executionTimeMs <= 600000;
            },
            severity: 'warning',
        });
        // Outcome consistency
        this.addRule({
            name: 'OUTCOME_CONSISTENCY',
            description: 'Output result should match success status',
            validate: (feedback) => {
                const hasSuccess = feedback.outputResult.includes('SUCCESS');
                const hasFail = feedback.outputResult.includes('FAILURE');
                return feedback.success === hasSuccess || feedback.success === !hasFail;
            },
            severity: 'warning',
        });
        // Learning potential threshold
        this.addRule({
            name: 'LEARNING_POTENTIAL',
            description: 'Feedback should have learning potential > 0.2',
            validate: (feedback) => {
                return feedback.outcomeAnalysis.learningPotential >= 0.2;
            },
            severity: 'info',
        });
        // No duplicate feedback
        this.addRule({
            name: 'NO_DUPLICATE',
            description: 'Feedback should be unique',
            validate: (feedback) => {
                const isDuplicate = this.validationHistory.some((r) => r.feedbackId !== feedback.id &&
                    r.feedbackId === feedback.executionRecordId &&
                    Math.abs(r.timestamp - feedback.timestamp) < 1000);
                return !isDuplicate;
            },
            severity: 'warning',
        });
        // Tool name validation
        this.addRule({
            name: 'VALID_TOOL_NAME',
            description: 'Tool name should be non-empty',
            validate: (feedback) => {
                return feedback.toolName.length > 0 && !feedback.toolName.includes(' ');
            },
            severity: 'critical',
        });
        // Surprise factor reasonable
        this.addRule({
            name: 'SURPRISE_FACTOR_VALID',
            description: 'Surprise factor should be between 0 and 1',
            validate: (feedback) => {
                const sf = feedback.outcomeAnalysis.surpriseFactor;
                return sf >= 0 && sf <= 1;
            },
            severity: 'warning',
        });
    }
    generateRecommendations(feedback, failedRules) {
        const recommendations = [];
        const criticalFails = failedRules.filter((r) => r.severity === 'critical');
        if (criticalFails.length > 0) {
            recommendations.push('Critical validation failures detected. Review data quality before learning.');
        }
        if (feedback.executionTimeMs > 5000) {
            recommendations.push('Execution took longer than expected. Consider optimizing the tool.');
        }
        if (feedback.outcomeAnalysis.surpriseFactor > 0.7) {
            recommendations.push('Unexpected outcome detected. High learning potential for prediction models.');
        }
        if (!feedback.success && feedback.feedbackRelevance > 0.7) {
            recommendations.push('Failure with high learning potential. Analyze error patterns.');
        }
        return recommendations;
    }
}
exports.ValidationOrchestrator = ValidationOrchestrator;
//# sourceMappingURL=validationOrchestrator.js.map