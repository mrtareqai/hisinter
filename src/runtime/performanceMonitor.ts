/**
 * Real-time performance monitoring system
 * Tracks agent execution metrics and optimization opportunities
 */

export interface PerformanceMetrics {
    agentExecutionTime: number;
    toolExecutionTime: number;
    modelLatency: number;
    contextProcessingTime: number;
    memoryUsage: number;
    tokenUsage: number;
    successRate: number;
    averageIterations: number;
}

export interface PerformanceAlert {
    severity: 'low' | 'medium' | 'high';
    message: string;
    metric: string;
    threshold: number;
    actual: number;
    timestamp: number;
}

export class PerformanceMonitor {
    private metrics: PerformanceMetrics = {
        agentExecutionTime: 0,
        toolExecutionTime: 0,
        modelLatency: 0,
        contextProcessingTime: 0,
        memoryUsage: 0,
        tokenUsage: 0,
        successRate: 0,
        averageIterations: 0,
    };

    private history: PerformanceMetrics[] = [];
    private alerts: PerformanceAlert[] = [];
    private thresholds = {
        agentExecutionTime: 5000,
        modelLatency: 3000,
        memoryUsage: 500 * 1024 * 1024,
        contextProcessingTime: 1000,
    };

    private activeTimers = new Map<string, number>();

    startTimer(timerName: string): void {
        this.activeTimers.set(timerName, performance.now());
    }

    endTimer(timerName: string, metricName: keyof PerformanceMetrics): number {
        const start = this.activeTimers.get(timerName);
        if (!start) return 0;

        const duration = performance.now() - start;
        this.activeTimers.delete(timerName);

        // Update metric (averaging with previous value)
        const current = this.metrics[metricName] as number;
        this.metrics[metricName] = (current + duration) / 2;

        this.checkThresholds();
        return duration;
    }

    recordMetric<K extends keyof PerformanceMetrics>(key: K, value: PerformanceMetrics[K]): void {
        this.metrics[key] = value;
        this.checkThresholds();
    }

    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    getAlerts(): PerformanceAlert[] {
        // Return only recent alerts (last 1 minute)
        const oneMinuteAgo = Date.now() - 60000;
        return this.alerts.filter(a => a.timestamp > oneMinuteAgo);
    }

    private checkThresholds(): void {
        for (const [metric, threshold] of Object.entries(this.thresholds)) {
            const actual = this.metrics[metric as keyof PerformanceMetrics] as number;
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

    private addAlert(alert: PerformanceAlert): void {
        // Avoid duplicate alerts
        const exists = this.alerts.some(
            a => a.metric === alert.metric && (Date.now() - a.timestamp) < 5000
        );
        if (!exists) {
            this.alerts.push(alert);
            if (this.alerts.length > 100) {
                this.alerts.shift();
            }
        }
    }

    recordCompletion(success: boolean, iterations: number): void {
        const totalIterations = this.metrics.averageIterations;
        this.metrics.averageIterations = (totalIterations + iterations) / 2;
        
        const successCount = Math.round(this.metrics.successRate * 100);
        const total = successCount + 1;
        this.metrics.successRate = success ? (successCount + 1) / total : successCount / total;
    }

    saveSnapshot(): void {
        if (this.history.length >= 100) {
            this.history.shift();
        }
        this.history.push({ ...this.metrics });
    }

    getHistory(): PerformanceMetrics[] {
        return [...this.history];
    }

    getOptimizationSuggestions(): string[] {
        const suggestions: string[] = [];

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

    reset(): void {
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

export const globalMonitor = new PerformanceMonitor();
