export interface ExecutionThresholds {
    executionThreshold: number;
    rollbackThreshold: number;
    confirmationThreshold: number;
    blockingThreshold: number;
}
export type ExecutionDecision = 'execute' | 'execute-with-rollback' | 'confirm' | 'block';
export interface ExecutionRequest {
    id: string;
    goalId: string;
    action: string;
    parameters: Record<string, unknown>;
    prediction: {
        confidence: number;
        expectedDuration: number;
        successProbability: number;
        riskLevel: 'low' | 'medium' | 'high';
    };
    context: {
        dependsOn: string[];
        affectsFiles: string[];
        hasRollback: boolean;
        isProduction: boolean;
    };
}
export interface ExecutionOutcome {
    executionId: string;
    decision: ExecutionDecision;
    timestamp: number;
    reason: string;
    thresholdUsed: keyof ExecutionThresholds;
    executed: boolean;
    result?: {
        success: boolean;
        duration: number;
        output: Record<string, unknown>;
    };
}
export default class AutonomyController {
    private thresholds;
    private executionHistory;
    private confidenceCalibration;
    /**
     * Decide whether to execute a request autonomously
     */
    decide(request: ExecutionRequest): ExecutionDecision;
    /**
     * Adjust confidence based on risk factors
     */
    private adjustConfidenceForRisk;
    /**
     * Execute an autonomous decision
     */
    executeDecision(request: ExecutionRequest, decision: ExecutionDecision, executor?: (req: ExecutionRequest) => Promise<{
        success: boolean;
        output: Record<string, unknown>;
    }>): Promise<ExecutionOutcome>;
    /**
     * Determine which threshold was used for decision
     */
    private getThresholdUsed;
    /**
     * Dynamically adjust thresholds based on performance
     */
    calibrateThresholds(): void;
    /**
     * Get autonomy metrics
     */
    getAutonomyMetrics(): {
        totalDecisions: number;
        autonomousExecutions: number;
        autonomyScore: number;
        executionSuccessRate: number;
        averageConfidenceWhenSuccessful: number;
        averageConfidenceWhenFailed: number;
        thresholdCalibrationAccuracy: number;
    };
    /**
     * Get average confidence for successful or failed outcomes
     */
    private getAverageConfidenceForOutcome;
    /**
     * Get execution history
     */
    getHistory(): ExecutionOutcome[];
    /**
     * Get current thresholds
     */
    getThresholds(): ExecutionThresholds;
    /**
     * Set custom thresholds
     */
    setThresholds(thresholds: Partial<ExecutionThresholds>): void;
    /**
     * Clear history
     */
    clearHistory(): void;
}
