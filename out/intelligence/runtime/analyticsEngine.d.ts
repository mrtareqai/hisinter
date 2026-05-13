import { ExecutionCycleMetrics } from './autonomousRuntimeAgent';
import { ExecutionFeedback } from './feedbackCollector';
import { LearningUpdate } from './learningEngine';
/**
 * Comprehensive analytics about agent performance and learning
 */
export interface AnalyticsReport {
    reportId: string;
    generatedAt: number;
    timeWindow: {
        from: number;
        to: number;
        durationMs: number;
    };
    executionMetrics: {
        totalCycles: number;
        successfulCycles: number;
        failedCycles: number;
        averageSuccessRate: number;
        totalExecutionTime: number;
        averageExecutionTime: number;
        throughput: number;
    };
    feedbackMetrics: {
        totalFeedback: number;
        validFeedback: number;
        invalidFeedback: number;
        validationAccuracy: number;
        averageFeedbackRelevance: number;
    };
    learningMetrics: {
        totalLearnings: number;
        successPatterns: number;
        failurePatterns: number;
        anomalies: number;
        modelAccuracy: number;
        predictionImprovement: number;
    };
    environmentMetrics: {
        filesModified: number;
        commandsExecuted: number;
        averageCommandDuration: number;
        commandSuccessRate: number;
    };
    systemHealth: {
        overall: number;
        components: Record<string, number>;
        bottlenecks: string[];
        recommendations: string[];
    };
}
/**
 * AnalyticsEngine processes and analyzes runtime metrics
 */
export declare class AnalyticsEngine {
    private readonly persistencePath;
    private reports;
    constructor(persistencePath?: string);
    /**
     * Generate comprehensive analytics report
     */
    generateReport(cycles: ExecutionCycleMetrics[], feedbacks: ExecutionFeedback[], learnings: LearningUpdate[], terminalMetrics: any, filesystemState: Record<string, any>): AnalyticsReport;
    /**
     * Get trend analysis over time
     */
    getTrendAnalysis(reports: AnalyticsReport[], window?: number): {
        successRateTrend: number[];
        learningVelocity: number[];
        systemHealthTrend: number[];
        improvementRate: number;
    };
    /**
     * Predict future performance
     */
    predictFuturePerformance(historicalReports: AnalyticsReport[]): {
        predictedSuccessRate: number;
        predictedLearningRate: number;
        confidenceScore: number;
        timeToTarget: number;
    };
    /**
     * Identify optimization opportunities
     */
    identifyOptimizations(report: AnalyticsReport): {
        priority: 'critical' | 'high' | 'medium' | 'low';
        area: string;
        suggestion: string;
        expectedImprovement: number;
    }[];
    /**
     * Export report for external analysis
     */
    exportReport(report: AnalyticsReport, format?: 'json' | 'csv'): string;
    /**
     * Get all reports
     */
    getReports(limit?: number): AnalyticsReport[];
    /**
     * Get latest report
     */
    getLatestReport(): AnalyticsReport | null;
    /**
     * Private helper methods
     */
    private calculateExecutionMetrics;
    private calculateFeedbackMetrics;
    private calculateLearningMetrics;
    private calculateEnvironmentMetrics;
    private calculateSystemHealth;
    private identifyBottlenecks;
    private generateRecommendations;
    private calculateImprovementRate;
    private persistReport;
    private initializePersistence;
}
