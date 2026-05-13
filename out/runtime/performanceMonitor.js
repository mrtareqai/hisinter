"use strict";
/**
 * Real-time performance monitoring system
 * Tracks agent execution metrics and optimization opportunities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalMonitor = exports.PerformanceMonitor = void 0;
class PerformanceMonitor {
    metrics = {
        agentExecutionTime: 0,
        toolExecutionTime: 0,
        modelLatency: 0,
        contextProcessingTime: 0,
        memoryUsage: 0,
        tokenUsage: 0,
        successRate: 0,
        averageIterations: 0,
    };
    history = [];
    alerts = [];
    thresholds = {
        agentExecutionTime: 5000,
        modelLatency: 3000,
        memoryUsage: 500 * 1024 * 1024,
        contextProcessingTime: 1000,
    };
    activeTimers = new Map();
    startTimer(timerName) {
        this.activeTimers.set(timerName, performance.now());
    }
    endTimer(timerName, metricName) {
        const start = this.activeTimers.get(timerName);
        if (!start)
            return 0;
        const duration = performance.now() - start;
        this.activeTimers.delete(timerName);
        // Update metric (averaging with previous value)
        const current = this.metrics[metricName];
        this.metrics[metricName] = (current + duration) / 2;
        this.checkThresholds();
        return duration;
    }
    recordMetric(key, value) {
        this.metrics[key] = value;
        this.checkThresholds();
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getAlerts() {
        // Return only recent alerts (last 1 minute)
        const oneMinuteAgo = Date.now() - 60000;
        return this.alerts.filter(a => a.timestamp > oneMinuteAgo);
    }
    checkThresholds() {
        for (const [metric, threshold] of Object.entries(this.thresholds)) {
            const actual = this.metrics[metric];
            if (actual > threshold) {
                this.addAlert({
                    severity: actual > threshold * 1.5 ? 'high' : 'medium',
                    message: `${metric} exceeded threshold: ${actual.toFixed(2)}ms > ${threshold}ms`,
                    metric,
                    threshold,
                    actual,
                    timestamp: Date.now(),
                });
            }
        }
    }
    addAlert(alert) {
        // Avoid duplicate alerts
        const exists = this.alerts.some(a => a.metric === alert.metric && (Date.now() - a.timestamp) < 5000);
        if (!exists) {
            this.alerts.push(alert);
            if (this.alerts.length > 100) {
                this.alerts.shift();
            }
        }
    }
    recordCompletion(success, iterations) {
        const totalIterations = this.metrics.averageIterations;
        this.metrics.averageIterations = (totalIterations + iterations) / 2;
        const successCount = Math.round(this.metrics.successRate * 100);
        const total = successCount + 1;
        this.metrics.successRate = success ? (successCount + 1) / total : successCount / total;
    }
    saveSnapshot() {
        if (this.history.length >= 100) {
            this.history.shift();
        }
        this.history.push({ ...this.metrics });
    }
    getHistory() {
        return [...this.history];
    }
    getOptimizationSuggestions() {
        const suggestions = [];
        if (this.metrics.modelLatency > 2000) {
            suggestions.push('Consider using a faster model or enabling prompt caching');
        }
        if (this.metrics.contextProcessingTime > 800) {
            suggestions.push('Context is large - consider summarizing or chunking');
        }
        if (this.metrics.successRate < 0.7) {
            suggestions.push('Success rate is low - review system prompts and tool usage');
        }
        if (this.metrics.averageIterations > 10) {
            suggestions.push('Agent is taking too many iterations - refine task breakdown');
        }
        return suggestions;
    }
    reset() {
        this.metrics = {
            agentExecutionTime: 0,
            toolExecutionTime: 0,
            modelLatency: 0,
            contextProcessingTime: 0,
            memoryUsage: 0,
            tokenUsage: 0,
            successRate: 0,
            averageIterations: 0,
        };
        this.alerts = [];
        this.activeTimers.clear();
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
exports.globalMonitor = new PerformanceMonitor();
//# sourceMappingURL=performanceMonitor.js.map