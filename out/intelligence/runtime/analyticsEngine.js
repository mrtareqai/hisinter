"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * AnalyticsEngine processes and analyzes runtime metrics
 */
class AnalyticsEngine {
    persistencePath;
    reports = [];
    constructor(persistencePath = './intelligence-analytics') {
        this.persistencePath = persistencePath;
        this.initializePersistence();
    }
    /**
     * Generate comprehensive analytics report
     */
    generateReport(cycles, feedbacks, learnings, terminalMetrics, filesystemState) {
        const reportId = `report-${Date.now()}`;
        const now = Date.now();
        const oldestCycle = cycles.length > 0 ? cycles[0].startTime : now;
        const timeWindow = {
            from: oldestCycle,
            to: now,
            durationMs: now - oldestCycle,
        };
        const report = {
            reportId,
            generatedAt: now,
            timeWindow,
            executionMetrics: this.calculateExecutionMetrics(cycles),
            feedbackMetrics: this.calculateFeedbackMetrics(feedbacks),
            learningMetrics: this.calculateLearningMetrics(learnings),
            environmentMetrics: this.calculateEnvironmentMetrics(terminalMetrics, filesystemState),
            systemHealth: this.calculateSystemHealth(cycles, feedbacks, learnings),
        };
        this.reports.push(report);
        this.persistReport(report);
        return report;
    }
    /**
     * Get trend analysis over time
     */
    getTrendAnalysis(reports, window = 10) {
        const recentReports = reports.slice(-window);
        return {
            successRateTrend: recentReports.map((r) => r.executionMetrics.averageSuccessRate),
            learningVelocity: recentReports.map((r) => r.learningMetrics.totalLearnings),
            systemHealthTrend: recentReports.map((r) => r.systemHealth.overall),
            improvementRate: this.calculateImprovementRate(recentReports),
        };
    }
    /**
     * Predict future performance
     */
    predictFuturePerformance(historicalReports) {
        if (historicalReports.length < 2) {
            return {
                predictedSuccessRate: 0.5,
                predictedLearningRate: 0,
                confidenceScore: 0.2,
                timeToTarget: 0,
            };
        }
        const recent = historicalReports.slice(-5);
        const avgSuccessRate = recent.reduce((sum, r) => sum + r.executionMetrics.averageSuccessRate, 0) /
            recent.length;
        const avgLearningRate = recent.reduce((sum, r) => sum + r.learningMetrics.totalLearnings, 0) /
            recent.length;
        // Simple linear projection
        const improvement = recent[recent.length - 1].executionMetrics.averageSuccessRate -
            recent[0].executionMetrics.averageSuccessRate;
        const projectedSuccess = Math.min(1, avgSuccessRate + improvement * 0.5);
        const cyclesNeeded = avgSuccessRate > 0.9 ? 0 : (0.9 - avgSuccessRate) / 0.05;
        return {
            predictedSuccessRate: projectedSuccess,
            predictedLearningRate: avgLearningRate,
            confidenceScore: Math.min(1, recent.length / 10),
            timeToTarget: cyclesNeeded * 5, // minutes
        };
    }
    /**
     * Identify optimization opportunities
     */
    identifyOptimizations(report) {
        const optimizations = [];
        // Low success rate
        if (report.executionMetrics.averageSuccessRate < 0.7) {
            optimizations.push({
                priority: 'critical',
                area: 'Execution Quality',
                suggestion: 'Many executions are failing. Review error patterns and validate tool configurations.',
                expectedImprovement: 0.2,
            });
        }
        // Low learning
        if (report.learningMetrics.totalLearnings <
            report.executionMetrics.totalCycles * 0.3) {
            optimizations.push({
                priority: 'high',
                area: 'Learning Rate',
                suggestion: 'Increase feedback quality validation. Many executions are not generating learnings.',
                expectedImprovement: 0.15,
            });
        }
        // Slow commands
        if (report.environmentMetrics.averageCommandDuration > 5000) {
            optimizations.push({
                priority: 'medium',
                area: 'Command Performance',
                suggestion: 'Terminal commands are slow. Consider caching results or optimizing command structure.',
                expectedImprovement: 0.1,
            });
        }
        // Low prediction accuracy
        if (report.learningMetrics.modelAccuracy < 0.6) {
            optimizations.push({
                priority: 'high',
                area: 'Model Accuracy',
                suggestion: 'Prediction models need retraining. More diverse feedback data is needed.',
                expectedImprovement: 0.25,
            });
        }
        return optimizations;
    }
    /**
     * Export report for external analysis
     */
    exportReport(report, format = 'json') {
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        }
        // CSV format
        const headers = [
            'Metric',
            'Value',
            'Category',
        ];
        const rows = [
            [
                'Total Cycles',
                report.executionMetrics.totalCycles.toString(),
                'Execution',
            ],
            [
                'Success Rate',
                (report.executionMetrics.averageSuccessRate * 100).toFixed(2) + '%',
                'Execution',
            ],
            [
                'Valid Feedback',
                report.feedbackMetrics.validFeedback.toString(),
                'Feedback',
            ],
            [
                'Learning Updates',
                report.learningMetrics.totalLearnings.toString(),
                'Learning',
            ],
            [
                'System Health',
                (report.systemHealth.overall * 100).toFixed(2) + '%',
                'Health',
            ],
        ];
        return ([headers, ...rows]
            .map((row) => row.join(','))
            .join('\n'));
    }
    /**
     * Get all reports
     */
    getReports(limit = 100) {
        return this.reports.slice(-limit);
    }
    /**
     * Get latest report
     */
    getLatestReport() {
        return this.reports.length > 0 ? this.reports[this.reports.length - 1] : null;
    }
    /**
     * Private helper methods
     */
    calculateExecutionMetrics(cycles) {
        const successful = cycles.filter((c) => c.successRate >= 0.8).length;
        const failed = cycles.length - successful;
        const totalTime = cycles.reduce((sum, c) => sum + (c.duration || 0), 0);
        const avgTime = cycles.length > 0 ? totalTime / cycles.length : 0;
        const avgSuccessRate = cycles.length > 0
            ? cycles.reduce((sum, c) => sum + c.successRate, 0) / cycles.length
            : 0;
        return {
            totalCycles: cycles.length,
            successfulCycles: successful,
            failedCycles: failed,
            averageSuccessRate: avgSuccessRate,
            totalExecutionTime: totalTime,
            averageExecutionTime: avgTime,
            throughput: cycles.length > 0 ? (cycles.length / totalTime) * 60000 : 0,
        };
    }
    calculateFeedbackMetrics(feedbacks) {
        const valid = feedbacks.filter((f) => f.success).length;
        const avgRelevance = feedbacks.length > 0
            ? feedbacks.reduce((sum, f) => sum + f.outcomeAnalysis.learningPotential, 0) / feedbacks.length
            : 0;
        return {
            totalFeedback: feedbacks.length,
            validFeedback: valid,
            invalidFeedback: feedbacks.length - valid,
            validationAccuracy: feedbacks.length > 0 ? valid / feedbacks.length : 0,
            averageFeedbackRelevance: avgRelevance,
        };
    }
    calculateLearningMetrics(learnings) {
        const successes = learnings.filter((l) => l.sourceType === 'success').length;
        const failures = learnings.filter((l) => l.sourceType === 'failure').length;
        const anomalies = learnings.filter((l) => l.sourceType === 'anomaly').length;
        return {
            totalLearnings: learnings.length,
            successPatterns: successes,
            failurePatterns: failures,
            anomalies,
            modelAccuracy: learnings.length > 0 ? successes / learnings.length : 0,
            predictionImprovement: learnings.length > 0
                ? learnings.reduce((sum, l) => sum + l.impact.predictionAccuracyDelta, 0) /
                    learnings.length
                : 0,
        };
    }
    calculateEnvironmentMetrics(terminalMetrics, filesystemState) {
        const filesModified = Object.keys(filesystemState).length;
        return {
            filesModified,
            commandsExecuted: terminalMetrics.totalExecutions || 0,
            averageCommandDuration: terminalMetrics.averageDuration || 0,
            commandSuccessRate: terminalMetrics.successRate || 0,
        };
    }
    calculateSystemHealth(cycles, feedbacks, learnings) {
        const executionHealth = cycles.length > 0
            ? cycles.reduce((sum, c) => sum + c.successRate, 0) / cycles.length
            : 0.5;
        const feedbackHealth = feedbacks.length > 0 ? 1 : 0.5;
        const learningHealth = learnings.length > 0
            ? learnings.filter((l) => l.sourceType === 'success').length /
                learnings.length
            : 0.5;
        const overall = (executionHealth + feedbackHealth + learningHealth) / 3;
        return {
            overall,
            components: {
                execution: executionHealth,
                feedback: feedbackHealth,
                learning: learningHealth,
            },
            bottlenecks: this.identifyBottlenecks(cycles, feedbacks),
            recommendations: this.generateRecommendations(overall),
        };
    }
    identifyBottlenecks(cycles, feedbacks) {
        const bottlenecks = [];
        // Check for slow cycles
        if (cycles.length > 0) {
            const slowCycles = cycles.filter((c) => (c.duration || 0) > 10000).length;
            if (slowCycles / cycles.length > 0.3) {
                bottlenecks.push('Slow execution cycles detected');
            }
        }
        // Check for low feedback
        if (feedbacks.length === 0) {
            bottlenecks.push('No feedback being collected');
        }
        return bottlenecks;
    }
    generateRecommendations(health) {
        if (health > 0.9) {
            return ['System performing excellently. Continue monitoring.'];
        }
        if (health > 0.7) {
            return [
                'System healthy. Look for optimization opportunities.',
            ];
        }
        if (health > 0.5) {
            return ['System needs attention. Review failure patterns.'];
        }
        return [
            'System unhealthy. Perform diagnostics and reset if necessary.',
        ];
    }
    calculateImprovementRate(reports) {
        if (reports.length < 2)
            return 0;
        const first = reports[0].executionMetrics.averageSuccessRate;
        const last = reports[reports.length - 1].executionMetrics.averageSuccessRate;
        return last - first;
    }
    persistReport(report) {
        const fileName = `report-${report.reportId}.json`;
        const filePath = path.join(this.persistencePath, fileName);
        try {
            fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
        }
        catch (error) {
            console.error('[v0] Failed to persist analytics report:', error);
        }
    }
    initializePersistence() {
        if (!fs.existsSync(this.persistencePath)) {
            fs.mkdirSync(this.persistencePath, { recursive: true });
        }
    }
}
exports.AnalyticsEngine = AnalyticsEngine;
//# sourceMappingURL=analyticsEngine.js.map