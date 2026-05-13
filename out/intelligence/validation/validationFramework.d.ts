export interface ValidationExpectation {
    name: string;
    validator: (result: any) => boolean;
    tolerance: number;
    severity: 'warning' | 'error' | 'critical';
    description: string;
}
export interface ValidationReport {
    executionId: string;
    expectations: Array<{
        name: string;
        passed: boolean;
        actualValue: any;
        expectedValue: any;
        severity: string;
        message: string;
    }>;
    overallQuality: number;
    timestamp: number;
}
export declare class ValidationFramework {
    private expectations;
    private validationHistory;
    private qualityTrend;
    constructor();
    private initializeDefaultExpectations;
    addExpectation(expectation: ValidationExpectation): void;
    validateResult(executionId: string, result: any): Promise<ValidationReport>;
    getQualityTrend(): 'improving' | 'stable' | 'degrading';
    getAverageQuality(limit?: number): number;
    getValidationHistory(limit?: number): ValidationReport[];
    generateQualityReport(): {
        currentQuality: number;
        trend: string;
        recommendations: string[];
        passRate: number;
    };
}
export default ValidationFramework;
