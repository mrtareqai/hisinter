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
exports.LearningEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * LearningEngine processes validated feedback to update intelligence systems
 */
class LearningEngine {
    learningHistory = [];
    modelUpdates = new Map();
    persistencePath;
    maxLearningItems = 50000;
    constructor(persistencePath = './intelligence-learning') {
        this.persistencePath = persistencePath;
        this.initializePersistence();
    }
    /**
     * Process validated feedback to generate learning updates
     */
    async processValidatedFeedback(feedback, validation) {
        if (!validation.isValid) {
            console.log(`[v0] Skipping invalid feedback for learning: ${validation.failedRules.map((r) => r.name).join(', ')}`);
            return null;
        }
        const sourceType = this.determineSourceType(feedback, validation);
        const pattern = this.extractPattern(feedback);
        const impact = await this.estimateImpact(feedback, pattern);
        const update = {
            id: `learn-${feedback.id}`,
            timestamp: Date.now(),
            sourceType,
            pattern,
            impact,
            applicableContext: this.extractContext(feedback),
        };
        this.learningHistory.push(update);
        // Maintain size limit
        if (this.learningHistory.length > this.maxLearningItems) {
            this.learningHistory = this.learningHistory.slice(-this.maxLearningItems);
        }
        await this.persistLearning(update);
        return update;
    }
    /**
     * Batch process multiple validated feedbacks
     */
    async processBatchValidatedFeedback(feedbacks, validations) {
        const updates = [];
        for (let i = 0; i < feedbacks.length; i++) {
            const update = await this.processValidatedFeedback(feedbacks[i], validations[i]);
            if (update) {
                updates.push(update);
            }
        }
        return updates;
    }
    /**
     * Update prediction model with new learning
     */
    async updatePredictionModel(update) {
        const toolKey = `prediction_${update.pattern.toolName}`;
        if (!this.modelUpdates.has(toolKey)) {
            this.modelUpdates.set(toolKey, {
                totalSamples: 0,
                successCount: 0,
                avgExecutionTime: 0,
                confidenceScores: [],
            });
        }
        const model = this.modelUpdates.get(toolKey);
        model.totalSamples++;
        if (update.sourceType === 'success') {
            model.successCount++;
        }
        // Update rolling average confidence
        model.confidenceScores.push(update.pattern.confidence);
        if (model.confidenceScores.length > 100) {
            model.confidenceScores.shift();
        }
        model.avgConfidence =
            model.confidenceScores.reduce((a, b) => a + b, 0) /
                model.confidenceScores.length;
    }
    /**
     * Update performance prediction model
     */
    async updatePerformanceModel(feedback, update) {
        const perfKey = `perf_${feedback.toolName}`;
        if (!this.modelUpdates.has(perfKey)) {
            this.modelUpdates.set(perfKey, {
                executionTimes: [],
                successRates: [],
            });
        }
        const model = this.modelUpdates.get(perfKey);
        model.executionTimes.push(feedback.executionTimeMs);
        // Keep rolling window of recent executions
        if (model.executionTimes.length > 100) {
            model.executionTimes.shift();
        }
        model.avgExecutionTime =
            model.executionTimes.reduce((a, b) => a + b, 0) / model.executionTimes.length;
    }
    /**
     * Generate learning summary for intelligence systems
     */
    generateLearningSummary() {
        const successes = this.learningHistory.filter((l) => l.sourceType === 'success');
        const failures = this.learningHistory.filter((l) => l.sourceType === 'failure');
        const anomalies = this.learningHistory.filter((l) => l.sourceType === 'anomaly');
        const improvements = new Map();
        this.modelUpdates.forEach((model, key) => {
            const successRate = model.totalSamples > 0 ? model.successCount / model.totalSamples : 0;
            improvements.set(key, successRate);
        });
        return {
            totalLearning: this.learningHistory.length,
            successPatterns: successes,
            failurePatterns: failures,
            anomalies,
            modelImprovements: improvements,
        };
    }
    /**
     * Get applicable learning for a specific context
     */
    getApplicableLearning(context) {
        return this.learningHistory.filter((update) => {
            if (update.pattern.toolName !== context.toolName)
                return false;
            if (context.projectType &&
                update.applicableContext.projectType &&
                update.applicableContext.projectType !== context.projectType) {
                return false;
            }
            return true;
        });
    }
    /**
     * Export models for integration with other systems
     */
    exportModels() {
        const models = {};
        this.modelUpdates.forEach((value, key) => {
            models[key] = value;
        });
        return models;
    }
    /**
     * Private helper methods
     */
    determineSourceType(feedback, validation) {
        if (feedback.success && validation.validationScore >= 0.8) {
            return 'success';
        }
        if (!feedback.success) {
            return 'failure';
        }
        if (validation.validationScore < 0.5) {
            return 'anomaly';
        }
        return 'success';
    }
    extractPattern(feedback) {
        // Create signature from input parameters
        const inputSig = Object.keys(feedback.inputParameters)
            .sort()
            .map((k) => `${k}:${typeof feedback.inputParameters[k]}`)
            .join('|');
        // Extract outcome pattern
        const outcomeSig = feedback.outcomeAnalysis.expectedVsActual;
        return {
            toolName: feedback.toolName,
            inputSignature: inputSig,
            outcomePattern: outcomeSig,
            confidence: feedback.outcomeAnalysis.learningPotential,
        };
    }
    async estimateImpact(feedback, pattern) {
        // Determine which intelligence systems are affected
        const affectedSystems = this.getAffectedSystems(feedback.toolName);
        // Estimate prediction accuracy improvement
        const predictionDelta = feedback.outcomeAnalysis.learningPotential * 0.15; // Max 15% impact
        // Estimate performance improvement
        const perfDelta = feedback.executionTimeMs < 500
            ? 0.05
            : feedback.executionTimeMs > 5000
                ? -0.02
                : 0;
        return {
            affectedSystems,
            predictionAccuracyDelta: predictionDelta,
            performanceDelta: perfDelta,
        };
    }
    getAffectedSystems(toolName) {
        // Map tools to intelligence systems
        const systemMap = {
            'file-write': ['DeepReasoningEngine', 'PerformancePredictor'],
            'terminal-exec': ['ExecutionOptimizer', 'RiskAssessor'],
            'code-gen': ['DeepReasoningEngine', 'CodePatternAnalyzer'],
            'vscode-api': ['ToolIntelligence', 'ContextScoringSystem'],
        };
        return systemMap[toolName] || ['GeneralLearning'];
    }
    extractContext(feedback) {
        return {
            complexity: feedback.executionTimeMs > 5000 ? 'high' : 'low',
            constraints: this.extractConstraints(feedback),
        };
    }
    extractConstraints(feedback) {
        const constraints = [];
        if (feedback.systemMetrics.memoryUsed > 500)
            constraints.push('high-memory');
        if (feedback.executionTimeMs > 10000)
            constraints.push('long-running');
        return constraints;
    }
    async persistLearning(update) {
        const fileName = `learning-${update.id}.json`;
        const filePath = path.join(this.persistencePath, fileName);
        try {
            fs.writeFileSync(filePath, JSON.stringify(update, null, 2));
        }
        catch (error) {
            console.error('[v0] Failed to persist learning:', error);
        }
    }
    initializePersistence() {
        if (!fs.existsSync(this.persistencePath)) {
            fs.mkdirSync(this.persistencePath, { recursive: true });
        }
    }
    getHistorySize() {
        return this.learningHistory.length;
    }
    clearHistory() {
        this.learningHistory = [];
        this.modelUpdates.clear();
    }
}
exports.LearningEngine = LearningEngine;
//# sourceMappingURL=learningEngine.js.map