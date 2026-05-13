export interface OperationConstraint {
    name: string;
    type: 'file_path' | 'command' | 'resource' | 'permission' | 'custom';
    rule: (context: Record<string, any>) => boolean;
    severity: 'warning' | 'error' | 'critical';
    description: string;
}
export interface ValidationResult {
    isValid: boolean;
    constraints: Array<{
        name: string;
        passed: boolean;
        severity: string;
        message: string;
    }>;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendedActions: string[];
}
export declare class SafetyValidator {
    private constraints;
    private riskHistory;
    constructor();
    private initializeDefaultConstraints;
    addConstraint(constraint: OperationConstraint): void;
    validateOperation(context: Record<string, any>): Promise<ValidationResult>;
    private generateRecommendations;
    getRiskTrend(): 'increasing' | 'stable' | 'decreasing';
    getConstraints(): Record<string, OperationConstraint>;
}
export default SafetyValidator;
