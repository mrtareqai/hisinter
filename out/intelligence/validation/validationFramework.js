"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationFramework = void 0;
class ValidationFramework {
    expectations = new Map();
    validationHistory = [];
    qualityTrend = [];
    constructor() {
        this.initializeDefaultExpectations();
    }
    initializeDefaultExpectations() {
        // Result type validation
        this.addExpectation({
            name: 'result_exists',
            validator: (result) => result !== null && result !== undefined,
            tolerance: 0.95,
            severity: 'critical',
            description: 'Result must not be null or undefined',
        });
        // No unexpected errors
        this.addExpectation({
            name: 'no_critical_errors',
            validator: (result) => !result.errors || result.errors.length === 0,
            tolerance: 0.99,
            severity: 'error',
            description: 'Execution should have no critical errors',
        });
        // Performance expectations
        this.addExpectation({
            name: 'reasonable_execution_time',
            validator: (result) => !result.duration || result.duration < 30000, // 30s
            tolerance: 0.9,
            severity: 'warning',
            description: 'Execution time should be under 30 seconds',
        });
        // Output validation
        this.addExpectation({
            name: 'valid_output_format',
            validator: (result) => result.output !== undefined,
            tolerance: 0.98,
            severity: 'error',
            description: 'Result must contain valid output',
        });
    }
    addExpectation(expectation) {
        this.expectations.set(expectation.name, expectation);
    }
    async validateResult(executionId, result) {
        const expectations = [];
        let passCount = 0;
        let totalCount = 0;
        for (const [name, expectation] of this.expectations.entries()) {
            totalCount++;
            try {
                const passed = expectation.validator(result);
                if (passed)
                    passCount++;
                expectations.push({
                    name,
                    passed,
                    actualValue: result,
                    expectedValue: expectation.description,
                    severity: expectation.severity,
                    message: passed
                        ? `✓ ${expectation.description}`
                        : `✗ ${expectation.description} (tolerance: ${(expectation.tolerance * 100).toFixed(0)}%)`,
                });
            }
            catch (error) {
                expectations.push({
                    name,
                    passed: false,
                    actualValue: error instanceof Error ? error.message : 'Unknown error',
                    expectedValue: expectation.description,
                    severity: 'error',
                    message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                });
            }
        }
        const overallQuality = totalCount > 0 ? passCount / totalCount : 0;
        this.qualityTrend.push(overallQuality);
        // Keep only last 100 entries
        if (this.qualityTrend.length > 100) {
            this.qualityTrend = this.qualityTrend.slice(-100);
        }
        const report = {
            executionId,
            expectations,
            overallQuality,
            timestamp: Date.now(),
        };
        this.validationHistory.push(report);
        // Keep only last 50 reports
        if (this.validationHistory.length > 50) {
            this.validationHistory = this.validationHistory.slice(-50);
        }
        return report;
    }
    getQualityTrend() {
        if (this.qualityTrend.length < 2)
            return 'stable';
        const recent = this.qualityTrend.slice(-5);
        const older = this.qualityTrend.slice(-10, -5);
        if (recent.length === 0 || older.length === 0)
            return 'stable';
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
        if (recentAvg > olderAvg + 0.1)
            return 'improving';
        if (recentAvg < olderAvg - 0.1)
            return 'degrading';
        return 'stable';
    }
    getAverageQuality(limit = 10) {
        if (this.qualityTrend.length === 0)
            return 0;
        const recent = this.qualityTrend.slice(-limit);
        return recent.reduce((a, b) => a + b, 0) / recent.length;
    }
    getValidationHistory(limit = 10) {
        return this.validationHistory.slice(-limit);
    }
    generateQualityReport() {
        const trend = this.getQualityTrend();
        const currentQuality = this.qualityTrend[this.qualityTrend.length - 1] || 0;
        const passRate = this.getAverageQuality();
        const recommendations = [];
        if (currentQuality < 0.7) {
            recommendations.push('Quality below 70% - increase validation and error handling');
            recommendations.push('Review recent executions for common failure patterns');
        }
        if (trend === 'degrading') {
            recommendations.push('Quality degrading - investigate recent changes');
            recommendations.push('Consider rolling back to previous stable version');
        }
        if (trend === 'improving') {
            recommendations.push('Quality improving - continue current approach');
            recommendations.push('Document successful patterns for reuse');
        }
        if (passRate > 0.95) {
            recommendations.push('High quality execution - consider raising standards');
        }
        return {
            currentQuality,
            trend,
            recommendations,
            passRate,
        };
    }
}
exports.ValidationFramework = ValidationFramework;
exports.default = ValidationFramework;
//# sourceMappingURL=validationFramework.js.map