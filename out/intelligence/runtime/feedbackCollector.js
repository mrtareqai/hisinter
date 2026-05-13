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
exports.FeedbackCollector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
/**
 * FeedbackCollector captures detailed execution feedback for learning
 */
class FeedbackCollector {
    feedbackHistory = [];
    persistencePath;
    maxHistorySize = 10000;
    constructor(persistencePath = './intelligence-feedback') {
        this.persistencePath = persistencePath;
        this.initializePersistence();
    }
    /**
     * Collect comprehensive feedback from an execution record
     */
    async collectFeedback(record, sequencePosition = 0, previousExecutionId) {
        const feedback = {
            id: (0, uuid_1.v4)(),
            executionRecordId: record.context.predictionId,
            timestamp: Date.now(),
            toolName: record.context.toolName,
            inputParameters: record.context.arguments,
            outputResult: record.actualOutcome,
            success: record.success,
            executionTimeMs: record.executionTime,
            systemMetrics: this.captureSystemMetrics(),
            outcomeAnalysis: {
                expectedVsActual: this.compareOutcomes(record.context.expectedOutcome || '', record.actualOutcome),
                surpriseFactor: this.calculateSurpriseFactor(record),
                learningPotential: record.feedbackRelevance,
            },
            environmentState: {
                projectStructure: this.captureProjectStructure(),
                fileSystemState: this.captureFileSystemState(),
                errorContext: this.captureErrorContext(record),
            },
            feedbackChain: {
                previousExecutionId,
                sequencePosition,
            },
        };
        this.feedbackHistory.push(feedback);
        // Maintain size limit
        if (this.feedbackHistory.length > this.maxHistorySize) {
            this.feedbackHistory = this.feedbackHistory.slice(-this.maxHistorySize);
        }
        return feedback;
    }
    /**
     * Batch collect feedback from multiple execution records
     */
    async collectBatchFeedback(records) {
        const feedbacks = [];
        for (let i = 0; i < records.length; i++) {
            const feedback = await this.collectFeedback(records[i], i, feedbacks[i - 1]?.id);
            feedbacks.push(feedback);
        }
        return feedbacks;
    }
    /**
     * Retrieve feedback by various criteria
     */
    getFeedbackByTool(toolName) {
        return this.feedbackHistory.filter((f) => f.toolName === toolName);
    }
    getFeedbackBySuccessRate(minSuccess = 0.8) {
        const successes = this.feedbackHistory.filter((f) => f.success);
        return successes;
    }
    getFeedbackByLearningPotential(minPotential = 0.6) {
        return this.feedbackHistory.filter((f) => f.outcomeAnalysis.learningPotential >= minPotential);
    }
    /**
     * Get recent feedback for a specific time window
     */
    getRecentFeedback(timeWindowMs = 3600000) {
        const cutoffTime = Date.now() - timeWindowMs;
        return this.feedbackHistory.filter((f) => f.timestamp >= cutoffTime);
    }
    /**
     * Persist feedback to disk for long-term learning
     */
    async persistFeedback(feedback) {
        const fileName = `feedback-${feedback.id}.json`;
        const filePath = path.join(this.persistencePath, fileName);
        try {
            fs.writeFileSync(filePath, JSON.stringify(feedback, null, 2));
        }
        catch (error) {
            console.error('[v0] Failed to persist feedback:', error);
        }
    }
    /**
     * Load feedback from disk
     */
    async loadPersistedFeedback(feedbackId) {
        const filePath = path.join(this.persistencePath, `feedback-${feedbackId}.json`);
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                return JSON.parse(content);
            }
        }
        catch (error) {
            console.error('[v0] Failed to load persisted feedback:', error);
        }
        return null;
    }
    /**
     * Generate feedback summary for analysis
     */
    generateFeedbackSummary() {
        const total = this.feedbackHistory.length;
        const successful = this.feedbackHistory.filter((f) => f.success).length;
        const avgTime = this.feedbackHistory.reduce((sum, f) => sum + f.executionTimeMs, 0) / total ||
            0;
        const highLearning = this.feedbackHistory
            .filter((f) => f.outcomeAnalysis.learningPotential >= 0.7)
            .sort((a, b) => b.outcomeAnalysis.learningPotential - a.outcomeAnalysis.learningPotential)
            .slice(0, 5);
        const failures = this.feedbackHistory.filter((f) => !f.success);
        const failurePatterns = this.analyzeFailurePatterns(failures);
        return {
            totalExecutions: total,
            successRate: total > 0 ? successful / total : 0,
            averageExecutionTime: avgTime,
            highLearningItems: highLearning,
            failurePatterns,
        };
    }
    /**
     * Private helper methods
     */
    captureSystemMetrics() {
        return {
            memoryUsed: process.memoryUsage().heapUsed / 1024 / 1024, // MB
            cpuLoad: process.uptime(), // Simple proxy
            diskIO: 'monitored',
        };
    }
    compareOutcomes(expected, actual) {
        if (expected === actual)
            return 'MATCHED';
        if (actual.includes('SUCCESS') && expected.includes('SUCCESS'))
            return 'SIMILAR';
        if (actual.includes('ERROR') && expected.includes('ERROR'))
            return 'SIMILAR_FAILURE';
        return 'DIVERGED';
    }
    calculateSurpriseFactor(record) {
        const expectedSuccess = record.context.confidence > 0.7;
        const actualSuccess = record.success;
        // Surprise when prediction was wrong
        if (expectedSuccess !== actualSuccess) {
            return 0.8;
        }
        // Surprise for unexpected timing
        if (record.executionTime > 10000 && record.context.confidence > 0.8) {
            return 0.5;
        }
        return 0.2;
    }
    captureProjectStructure() {
        try {
            const structure = fs.readdirSync(process.cwd()).slice(0, 5).join(', ');
            return structure;
        }
        catch {
            return 'UNAVAILABLE';
        }
    }
    captureFileSystemState() {
        const state = {};
        try {
            const files = fs.readdirSync(process.cwd());
            files.slice(0, 3).forEach((file) => {
                const stats = fs.statSync(path.join(process.cwd(), file));
                state[file] = stats.isDirectory() ? 'DIR' : 'FILE';
            });
        }
        catch {
            state['error'] = 'UNAVAILABLE';
        }
        return state;
    }
    captureErrorContext(record) {
        if (record.success) {
            return {};
        }
        return {
            errorMessage: record.result.output,
            toolName: record.context.toolName,
            argumentSnapshot: record.context.arguments,
        };
    }
    analyzeFailurePatterns(failures) {
        const patterns = new Map();
        failures.forEach((f) => {
            const matches = f.outputResult.match(/ERROR: ([A-Z_]+)/);
            if (matches) {
                const pattern = matches[1];
                patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
            }
        });
        return Array.from(patterns.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([pattern]) => pattern)
            .slice(0, 5);
    }
    initializePersistence() {
        if (!fs.existsSync(this.persistencePath)) {
            fs.mkdirSync(this.persistencePath, { recursive: true });
        }
    }
    getHistorySize() {
        return this.feedbackHistory.length;
    }
    clearHistory() {
        this.feedbackHistory = [];
    }
}
exports.FeedbackCollector = FeedbackCollector;
//# sourceMappingURL=feedbackCollector.js.map