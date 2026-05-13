"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskEvolutionSystem = void 0;
class TaskEvolutionSystem {
    taskEvolutions = new Map();
    strategyScores = new Map();
    initializeTask(taskId, initialComplexity) {
        const strategy = this.selectInitialStrategy(initialComplexity);
        const evolution = {
            taskId,
            initialComplexity,
            currentComplexity: initialComplexity,
            strategy,
            performanceHistory: [],
            adaptations: [],
            learnings: [],
        };
        this.taskEvolutions.set(taskId, evolution);
        return evolution;
    }
    selectInitialStrategy(complexity) {
        if (complexity < 0.3)
            return 'direct';
        if (complexity < 0.6)
            return 'iterative';
        if (complexity < 0.8)
            return 'decomposed';
        return 'experimental';
    }
    recordTaskMetrics(taskId, metrics) {
        const evolution = this.taskEvolutions.get(taskId);
        if (!evolution)
            return;
        evolution.performanceHistory.push(metrics);
        this.updateDifficulty(taskId, metrics);
    }
    updateDifficulty(taskId, metrics) {
        const evolution = this.taskEvolutions.get(taskId);
        if (!evolution)
            return;
        // Adjust complexity based on performance
        if (metrics.successRate < 0.5) {
            evolution.currentComplexity = Math.min(1, evolution.currentComplexity + 0.1);
        }
        else if (metrics.successRate > 0.9 && metrics.retries === 0) {
            evolution.currentComplexity = Math.max(0, evolution.currentComplexity - 0.05);
        }
        // Adapt strategy if needed
        this.checkAndAdaptStrategy(taskId);
    }
    checkAndAdaptStrategy(taskId) {
        const evolution = this.taskEvolutions.get(taskId);
        if (!evolution || evolution.performanceHistory.length < 3)
            return;
        const recentMetrics = evolution.performanceHistory.slice(-3);
        const avgSuccessRate = recentMetrics.reduce((sum, m) => sum + m.successRate, 0) / recentMetrics.length;
        if (avgSuccessRate < 0.6 && evolution.strategy !== 'decomposed') {
            const oldStrategy = evolution.strategy;
            evolution.strategy = 'decomposed';
            evolution.adaptations.push({
                timestamp: Date.now(),
                reason: `Low success rate (${(avgSuccessRate * 100).toFixed(1)}%) - switching strategy`,
                newStrategy: 'decomposed',
            });
            this.recordLearning(taskId, `Strategy adapted from ${oldStrategy} to decomposed due to performance`);
        }
        if (avgSuccessRate > 0.9 && evolution.strategy === 'experimental') {
            const oldStrategy = evolution.strategy;
            evolution.strategy = 'direct';
            evolution.adaptations.push({
                timestamp: Date.now(),
                reason: `High success rate (${(avgSuccessRate * 100).toFixed(1)}%) - optimizing strategy`,
                newStrategy: 'direct',
            });
            this.recordLearning(taskId, `Strategy optimized from ${oldStrategy} to direct due to consistent success`);
        }
    }
    recordLearning(taskId, learning) {
        const evolution = this.taskEvolutions.get(taskId);
        if (evolution) {
            evolution.learnings.push(learning);
        }
    }
    getTaskEvolution(taskId) {
        return this.taskEvolutions.get(taskId);
    }
    getPerformanceTrend(taskId) {
        const evolution = this.taskEvolutions.get(taskId);
        if (!evolution || evolution.performanceHistory.length < 2)
            return 'stable';
        const recent = evolution.performanceHistory.slice(-3);
        const older = evolution.performanceHistory.slice(-6, -3);
        if (recent.length === 0 || older.length === 0)
            return 'stable';
        const recentAvg = recent.reduce((sum, m) => sum + m.successRate, 0) / recent.length;
        const olderAvg = older.length > 0 ? older.reduce((sum, m) => sum + m.successRate, 0) / older.length : recentAvg;
        if (recentAvg > olderAvg + 0.1)
            return 'improving';
        if (recentAvg < olderAvg - 0.1)
            return 'degrading';
        return 'stable';
    }
    suggestOptimization(taskId) {
        const evolution = this.taskEvolutions.get(taskId);
        if (!evolution)
            return null;
        const trend = this.getPerformanceTrend(taskId);
        const recentMetrics = evolution.performanceHistory.slice(-1)[0];
        if (!recentMetrics)
            return null;
        if (trend === 'degrading') {
            return `Task is degrading - consider returning to previous strategy: ${evolution.adaptations[0]?.newStrategy || 'direct'}`;
        }
        if (recentMetrics.retries > 3) {
            return `High retry count - consider breaking task into smaller sub-tasks`;
        }
        if (recentMetrics.successRate < 0.7) {
            return `Success rate below 70% - increase error handling and validation`;
        }
        return `Task performing well - consider applying learnings to similar tasks`;
    }
    getAllEvolutions() {
        return Array.from(this.taskEvolutions.values());
    }
    getStrategyScores() {
        const scores = {};
        this.taskEvolutions.forEach((evolution) => {
            const avgSuccessRate = evolution.performanceHistory.length > 0
                ? evolution.performanceHistory.reduce((sum, m) => sum + m.successRate, 0) / evolution.performanceHistory.length
                : 0;
            if (!scores[evolution.strategy])
                scores[evolution.strategy] = 0;
            scores[evolution.strategy] += avgSuccessRate;
        });
        return scores;
    }
}
exports.TaskEvolutionSystem = TaskEvolutionSystem;
exports.default = TaskEvolutionSystem;
//# sourceMappingURL=taskEvolutionSystem.js.map