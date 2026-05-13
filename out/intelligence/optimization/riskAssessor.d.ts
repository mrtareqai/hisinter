export interface RiskFactor {
    id: string;
    name: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    probability: number;
    impact: number;
    mitigation: string;
}
export interface RiskAssessment {
    taskId: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    factors: Array<{
        id: string;
        name: string;
        severity: string;
        probability: number;
        impact: number;
        mitigation: string;
    }>;
    recommendations: string[];
    proceedAdvice: 'proceed' | 'caution' | 'review' | 'block';
    confidence: number;
}
export declare class RiskAssessor {
    private riskFactors;
    private assessmentHistory;
    constructor();
    private initializeRiskFactors;
    assessTask(taskId: string, context: {
        complexity: number;
        modifiesData: boolean;
        requiresNetwork: boolean;
        usesExternalTools: number;
        hasErrorHandling: boolean;
        isProduction: boolean;
    }): RiskAssessment;
    private getRiskLevel;
    private generateRecommendations;
    private getProceedAdvice;
    private calculateAssessmentConfidence;
    addRiskFactor(factor: RiskFactor): void;
    getRiskTrend(): 'increasing' | 'stable' | 'decreasing';
    getAssessmentHistory(limit?: number): RiskAssessment[];
}
export default RiskAssessor;
