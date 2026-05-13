/**
 * Intelligent retry system with exponential backoff and adaptive strategies
 * Handles transient failures and network issues gracefully
 */
export interface RetryConfig {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterFactor: number;
    timeoutMs: number;
}
export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    attempts: number;
    totalTimeMs: number;
}
export declare class RetryEngine {
    private defaultConfig;
    private retryHistory;
    execute<T>(operation: () => Promise<T>, operationId: string, config?: Partial<RetryConfig>): Promise<RetryResult<T>>;
    private isRetryable;
    private calculateDelay;
    private withTimeout;
    private sleep;
    private recordSuccess;
    private recordFailure;
    getHistory(operationId: string): {
        attempts: number;
        lastError?: Error;
        lastAttemptTime: number;
    };
    clearHistory(operationId?: string): void;
}
export declare const globalRetryEngine: RetryEngine;
