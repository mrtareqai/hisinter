"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AutonomyController {
    thresholds = {
        executionThreshold: 0.85,
        rollbackThreshold: 0.70,
        confirmationThreshold: 0.50,
        blockingThreshold: 0.30,
    };
    executionHistory = [];
    confidenceCalibration = new Map();
    /**
     * Decide whether to execute a request autonomously
     */
    decide(request) {
        const confidence = request.prediction.confidence;
        // Apply risk adjustment
        const adjustedConfidence = this.adjustConfidenceForRisk(confidence, request.prediction.riskLevel, request.context);
        // Determine decision
        if (adjustedConfidence >= this.thresholds.executionThreshold) {
            return 'execute';
        }
        else if (adjustedConfidence >= this.thresholds.rollbackThreshold) {
            return 'execute-with-rollback';
        }
        else if (adjustedConfidence >= this.thresholds.confirmationThreshold) {
            return 'confirm';
        }
        else {
            return 'block';
        }
    }
    /**
     * Adjust confidence based on risk factors
     */
    adjustConfidenceForRisk(baseConfidence, riskLevel, context) {
        let adjusted = baseConfidence;
        // Risk penalties
        const riskPenalties = {
            low: 0.0,
            medium: -0.1,
            high: -0.2,
        };
        adjusted += riskPenalties[riskLevel];
        // Context penalties
        if (context.isProduction) {
            adjusted -= 0.15; // More conservative in production
        }
        if (context.affectsFiles.length > 5) {
            adjusted -= 0.05; // Many files affected
        }
        if (!context.hasRollback) {
            adjusted -= 0.1; // No rollback capability
        }
        // Bonus for dependencies met
        if (context.dependsOn.length === 0) {
            adjusted += 0.05; // No dependencies
        }
        return Math.max(0, Math.min(1, adjusted));
    }
    /**
     * Execute an autonomous decision
     */
    async executeDecision(request, decision, executor) {
        const startTime = Date.now();
        let executed = false;
        let result = undefined;
        let reason = '';
        switch (decision) {
            case 'execute':
                executed = true;
                reason = `Confidence ${request.prediction.confidence.toFixed(2)} exceeds execution threshold ${this.thresholds.executionThreshold}`;
                if (executor) {
                    const execResult = await executor(request);
                    result = {
                        success: execResult.success,
                        duration: Date.now() - startTime,
                        output: execResult.output,
                    };
                }
                break;
            case 'execute-with-rollback':
                executed = true;
                reason = `Confidence ${request.prediction.confidence.toFixed(2)} within rollback threshold range`;
                if (executor) {
                    try {
                        const execResult = await executor(request);
                        result = {
                            success: execResult.success,
                            duration: Date.now() - startTime,
                            output: execResult.output,
                        };
                        if (!execResult.success && request.context.hasRollback) {
                            reason += ' (rolled back due to failure)';
                        }
                    }
                    catch (error) {
                        result = {
                            success: false,
                            duration: Date.now() - startTime,
                            output: { error: String(error) },
                        };
                        reason += ' (executed with error, rollback available)';
                    }
                }
                break;
            case 'confirm':
                executed = false;
                reason = `Confidence ${request.prediction.confidence.toFixed(2)} below autonomous threshold, requires user confirmation`;
                break;
            case 'block':
                executed = false;
                reason = `Confidence ${request.prediction.confidence.toFixed(2)} below minimum threshold ${this.thresholds.blockingThreshold}, execution blocked`;
                break;
        }
        const outcome = {
            executionId: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            decision,
            timestamp: Date.now(),
            reason,
            thresholdUsed: this.getThresholdUsed(request.prediction.confidence),
            executed,
            result,
        };
        this.executionHistory.push(outcome);
        // Track confidence calibration
        if (result) {
            const key = request.action;
            if (!this.confidenceCalibration.has(key)) {
                this.confidenceCalibration.set(key, []);
            }
            this.confidenceCalibration.get(key).push({
                predicted: request.prediction.confidence,
                actual: result.success ? 1 : 0,
            });
        }
        return outcome;
    }
    /**
     * Determine which threshold was used for decision
     */
    getThresholdUsed(confidence) {
        if (confidence >= this.thresholds.executionThreshold) {
            return 'executionThreshold';
        }
        else if (confidence >= this.thresholds.rollbackThreshold) {
            return 'rollbackThreshold';
        }
        else if (confidence >= this.thresholds.confirmationThreshold) {
            return 'confirmationThreshold';
        }
        else {
            return 'blockingThreshold';
        }
    }
    /**
     * Dynamically adjust thresholds based on performance
     */
    calibrateThresholds() {
        // Analyze confidence calibration
        let totalDrift = 0;
        let calibrationPoints = 0;
        for (const [action, calibrations] of this.confidenceCalibration.entries()) {
            if (calibrations.length < 5)
                continue; // Need at least 5 samples
            const avgPredicted = calibrations.reduce((sum, c) => sum + c.predicted, 0) / calibrations.length;
            const avgActual = calibrations.reduce((sum, c) => sum + c.actual, 0) / calibrations.length;
            const drift = avgActual - avgPredicted;
            totalDrift += Math.abs(drift);
            calibrationPoints++;
        }
        if (calibrationPoints === 0)
            return;
        const avgDrift = totalDrift / calibrationPoints;
        // Adjust thresholds based on drift
        // If predictions are too optimistic (avgDrift < 0), increase thresholds
        // If predictions are too pessimistic (avgDrift > 0), decrease thresholds
        if (avgDrift < -0.1) {
            // Too optimistic, be more conservative
            this.thresholds.executionThreshold = Math.min(0.95, this.thresholds.executionThreshold + 0.02);
            this.thresholds.rollbackThreshold = Math.min(0.85, this.thresholds.rollbackThreshold + 0.02);
        }
        else if (avgDrift > 0.1) {
            // Too pessimistic, be more aggressive
            this.thresholds.executionThreshold = Math.max(0.75, this.thresholds.executionThreshold - 0.02);
            this.thresholds.rollbackThreshold = Math.max(0.6, this.thresholds.rollbackThreshold - 0.02);
        }
        console.log(`[v0] Calibrated autonomy thresholds based on drift: ${avgDrift.toFixed(3)}`);
    }
    /**
     * Get autonomy metrics
     */
    getAutonomyMetrics() {
        const total = this.executionHistory.length;
        if (total === 0) {
            return {
                totalDecisions: 0,
                autonomousExecutions: 0,
                autonomyScore: 0,
                executionSuccessRate: 0,
                averageConfidenceWhenSuccessful: 0,
                averageConfidenceWhenFailed: 0,
                thresholdCalibrationAccuracy: 0,
            };
        }
        const autonomous = this.executionHistory.filter((o) => ['execute', 'execute-with-rollback'].includes(o.decision)).length;
        const executed = this.executionHistory.filter((o) => o.executed).length;
        const successful = this.executionHistory.filter((o) => o.result && o.result.success).length;
        // Calculate calibration accuracy
        let calibrationAccuracy = 0;
        let calibrationCount = 0;
        for (const calibrations of this.confidenceCalibration.values()) {
            for (const cal of calibrations) {
                const error = Math.abs(cal.predicted - cal.actual);
                calibrationAccuracy += 1 - error; // 0 error = 1.0 accuracy
                calibrationCount++;
            }
        }
        if (calibrationCount > 0) {
            calibrationAccuracy /= calibrationCount;
        }
        return {
            totalDecisions: total,
            autonomousExecutions: autonomous,
            autonomyScore: autonomous / total,
            executionSuccessRate: executed > 0 ? successful / executed : 0,
            averageConfidenceWhenSuccessful: this.getAverageConfidenceForOutcome(true),
            averageConfidenceWhenFailed: this.getAverageConfidenceForOutcome(false),
            thresholdCalibrationAccuracy: calibrationAccuracy,
        };
    }
    /**
     * Get average confidence for successful or failed outcomes
     */
    getAverageConfidenceForOutcome(success) {
        const outcomes = this.executionHistory.filter((o) => o.result && o.result.success === success);
        if (outcomes.length === 0)
            return 0;
        // Approximate confidence from decision type
        const confidenceMap = {
            execute: 0.85,
            'execute-with-rollback': 0.75,
            confirm: 0.6,
            block: 0.2,
        };
        return (outcomes.reduce((sum, o) => sum + (confidenceMap[o.decision] || 0.5), 0) /
            outcomes.length);
    }
    /**
     * Get execution history
     */
    getHistory() {
        return this.executionHistory;
    }
    /**
     * Get current thresholds
     */
    getThresholds() {
        return { ...this.thresholds };
    }
    /**
     * Set custom thresholds
     */
    setThresholds(thresholds) {
        this.thresholds = { ...this.thresholds, ...thresholds };
    }
    /**
     * Clear history
     */
    clearHistory() {
        this.executionHistory = [];
        this.confidenceCalibration.clear();
    }
}
exports.default = AutonomyController;
//# sourceMappingURL=autonomyController.js.map