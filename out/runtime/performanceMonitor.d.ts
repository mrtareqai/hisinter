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
export declare class PerformanceMonitor {
    private metrics;
    private history;
    private alerts;
    private thresholds;
    private activeTimers;
    startTimer(timerName: string): void;
    endTimer(timerName: string, metricName: keyof PerformanceMetrics): number;
    recordMetric<K extends keyof PerformanceMetrics>(key: K, value: PerformanceMetrics[K]): void;
    getMetrics(): PerformanceMetrics;
    getAlerts(): PerformanceAlert[];
    private checkThresholds;
    private addAlert;
    recordCompletion(success: boolean, iterations: number): void;
    saveSnapshot(): void;
    getHistory(): PerformanceMetrics[];
    getOptimizationSuggestions(): string[];
    reset(): void;
}
export declare const globalMonitor: PerformanceMonitor;
