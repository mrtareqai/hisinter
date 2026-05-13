"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskAssessor = void 0;
class RiskAssessor {
    riskFactors = new Map();
    assessmentHistory = [];
    constructor() {
        this.initializeRiskFactors();
    }
    initializeRiskFactors() {
        const factors = [
            {
                id: 'data-loss',
                name: 'Data Loss Risk',
                severity: 'critical',
                probability: 0.05,
                impact: 0.95,
                mitigation: 'Implement backup before operation',
            },
            {
                id: 'system-crash',
                name: 'System Crash Risk',
                severity: 'high',
                probability: 0.1,
                impact: 0.8,
                mitigation: 'Monitor resource usage, implement recovery',
            },
            {
                id: 'infinite-loop',
                name: 'Infinite Loop Risk',
                severity: 'high',
                probability: 0.15,
                impact: 0.7,
                mitigation: 'Add timeout checks and limits',
            },
            {
                id: 'dependency-conflict',
                name: 'Dependency Conflict',
                severity: 'medium',
                probability: 0.2,
                impact: 0.6,
                mitigation: 'Version lock and test before deployment',
            },
            {
                id: 'memory-leak',
                name: 'Memory Leak Risk',
                severity: 'high',
                probability: 0.12,
                impact: 0.75,
                mitigation: 'Profile memory usage, cleanup resources',
            },
            {
                id: 'network-failure',
                name: 'Network Failure',
                severity: 'medium',
                probability: 0.08,
                impact: 0.5,
                mitigation: 'Implement retry logic with exponential backoff',
            },
        ];
        factors.forEach((factor) => {
            this.riskFactors.set(factor.id, factor);
        });
    }
    assessTask(taskId, context) {
        const applicableFactors = [];
        let totalRiskScore = 0;
        // Evaluate each risk factor
        this.riskFactors.forEach((factor) => {
            let adjustedProbability = factor.probability;
            let adjustedImpact = factor.impact;
            // Adjust probability based on context
            if (context.complexity > 0.8) {
                adjustedProbability += 0.1;
            }
            if (context.modifiesData && factor.id === 'data-loss') {
                adjustedProbability += 0.2;
            }
            if (context.requiresNetwork && factor.id === 'network-failure') {
                adjustedProbability += 0.15;
            }
            if (!context.hasErrorHandling) {
                adjustedProbability += 0.1;
            }
            if (context.isProduction) {
                adjustedImpact += 0.2;
            }
            // Cap at 1
            adjustedProbability = Math.min(1, adjustedProbability);
            adjustedImpact = Math.min(1, adjustedImpact);
            const riskScore = adjustedProbability * adjustedImpact;
            // Include if risk score is meaningful
            if (riskScore > 0.05) {
                applicableFactors.push({
                    id: factor.id,
                    name: factor.name,
                    severity: factor.severity,
                    probability: adjustedProbability,
                    impact: adjustedImpact,
                    mitigation: factor.mitigation,
                });
                totalRiskScore += riskScore;
            }
        });
        // Sort by risk score
        applicableFactors.sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact));
        const riskLevel = this.getRiskLevel(totalRiskScore);
        const recommendations = this.generateRecommendations(applicableFactors, context);
        const proceedAdvice = this.getProceedAdvice(riskLevel, context);
        const confidence = this.calculateAssessmentConfidence(applicableFactors);
        const assessment = {
            taskId,
            riskLevel,
            riskScore: Math.min(1, totalRiskScore),
            factors: applicableFactors,
            recommendations,
            proceedAdvice,
            confidence,
        };
        this.assessmentHistory.push(assessment);
        // Keep history reasonable
        if (this.assessmentHistory.length > 100) {
            this.assessmentHistory = this.assessmentHistory.slice(-100);
        }
        return assessment;
    }
    getRiskLevel(score) {
        if (score >= 0.7)
            return 'critical';
        if (score >= 0.5)
            return 'high';
        if (score >= 0.3)
            return 'medium';
        return 'low';
    }
    generateRecommendations(factors, context) {
        const recommendations = [];
        // By severity
        const criticalFactors = factors.filter((f) => f.severity === 'critical');
        if (criticalFactors.length > 0) {
            recommendations.push(`CRITICAL: Address these factors:`);
            criticalFactors.forEach((f) => {
                recommendations.push(`  - ${f.mitigation}`);
            });
        }
        const highFactors = factors.filter((f) => f.severity === 'high');
        if (highFactors.length > 0) {
            recommendations.push(`HIGH: Recommended mitigations:`);
            highFactors.forEach((f) => {
                recommendations.push(`  - ${f.mitigation}`);
            });
        }
        // Context-specific
        if (!context.hasErrorHandling && factors.length > 0) {
            recommendations.push('Add comprehensive error handling');
        }
        if (context.modifiesData) {
            recommendations.push('Create backup before execution');
            recommendations.push('Test in staging environment first');
        }
        if (context.isProduction) {
            recommendations.push('Run during low-traffic period');
            recommendations.push('Have rollback plan ready');
        }
        return recommendations;
    }
    getProceedAdvice(riskLevel, context) {
        if (riskLevel === 'critical') {
            return context.isProduction ? 'block' : 'review';
        }
        if (riskLevel === 'high') {
            return context.isProduction ? 'review' : 'caution';
        }
        if (riskLevel === 'medium') {
            return 'caution';
        }
        return 'proceed';
    }
    calculateAssessmentConfidence(factors) {
        if (factors.length === 0)
            return 0.5;
        // More factors = more data = higher confidence
        const factorConfidence = Math.min(0.5, factors.length * 0.1);
        // Factors with high probability = higher confidence in assessment
        const highProbFactors = factors.filter((f) => f.probability > 0.6).length;
        const probabilityConfidence = (highProbFactors / factors.length) * 0.3;
        return Math.min(0.95, 0.3 + factorConfidence + probabilityConfidence);
    }
    addRiskFactor(factor) {
        this.riskFactors.set(factor.id, factor);
    }
    getRiskTrend() {
        if (this.assessmentHistory.length < 2)
            return 'stable';
        const recent = this.assessmentHistory.slice(-5);
        const older = this.assessmentHistory.slice(-10, -5);
        if (recent.length === 0 || older.length === 0)
            return 'stable';
        const recentAvg = recent.reduce((sum, a) => sum + a.riskScore, 0) / recent.length;
        const olderAvg = older.reduce((sum, a) => sum + a.riskScore, 0) / older.length;
        if (recentAvg > olderAvg + 0.1)
            return 'increasing';
        if (recentAvg < olderAvg - 0.1)
            return 'decreasing';
        return 'stable';
    }
    getAssessmentHistory(limit = 10) {
        return this.assessmentHistory.slice(-limit);
    }
}
exports.RiskAssessor = RiskAssessor;
exports.default = RiskAssessor;
//# sourceMappingURL=riskAssessor.js.map