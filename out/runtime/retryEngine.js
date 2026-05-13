"use strict";
/**
 * Intelligent retry system with exponential backoff and adaptive strategies
 * Handles transient failures and network issues gracefully
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalRetryEngine = exports.RetryEngine = void 0;
class RetryEngine {
    defaultConfig = {
        maxAttempts: 5,
        baseDelayMs: 100,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
        timeoutMs: 60000,
    };
    retryHistory = new Map();
    async execute(operation, operationId, config = {}) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const startTime = performance.now();
        let lastError;
        for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
            try {
                const result = await this.withTimeout(operation(), finalConfig.timeoutMs);
                // Success - record completion
                this.recordSuccess(operationId, attempt);
                return {
                    success: true,
                    data: result,
                    attempts: attempt,
                    totalTimeMs: performance.now() - startTime,
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Check if error is retryable
                if (!this.isRetryable(lastError) || attempt === finalConfig.maxAttempts) {
                    this.recordFailure(operationId, lastError, attempt);
                    return {
                        success: false,
                        error: lastError,
                        attempts: attempt,
                        totalTimeMs: performance.now() - startTime,
                    };
                }
                // Calculate delay with exponential backoff and jitter
                const delayMs = this.calculateDelay(attempt, finalConfig.baseDelayMs, finalConfig.maxDelayMs, finalConfig.backoffMultiplier, finalConfig.jitterFactor);
                console.log(`[Retry ${attempt}/${finalConfig.maxAttempts}] Retrying after ${delayMs}ms. Error: ${lastError.message}`);
                await this.sleep(delayMs);
            }
        }
        return {
            success: false,
            error: lastError || new Error('Unknown error'),
            attempts: finalConfig.maxAttempts,
            totalTimeMs: performance.now() - startTime,
        };
    }
    isRetryable(error) {
        const message = error.message.toLowerCase();
        // Network errors
        if (message.includes('econnrefused') || message.includes('timeout') || message.includes('enotfound')) {
            return true;
        }
        // HTTP errors
        if (message.includes('429') || message.includes('503') || message.includes('504')) {
            return true;
        }
        // Specific error patterns
        if (message.includes('temporarily unavailable') || message.includes('overloaded')) {
            return true;
        }
        return false;
    }
    calculateDelay(attempt, baseDelay, maxDelay, multiplier, jitterFactor) {
        const exponentialDelay = baseDelay * Math.pow(multiplier, attempt - 1);
        const capped = Math.min(exponentialDelay, maxDelay);
        const jitter = capped * jitterFactor * Math.random();
        return capped + jitter;
    }
    withTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)),
        ]);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    recordSuccess(operationId, attempts) {
        const history = this.retryHistory.get(operationId);
        this.retryHistory.set(operationId, {
            attempts: history ? (history.attempts + attempts) / 2 : attempts,
            lastAttemptTime: Date.now(),
        });
    }
    recordFailure(operationId, error, attempts) {
        this.retryHistory.set(operationId, {
            attempts,
            lastError: error,
            lastAttemptTime: Date.now(),
        });
    }
    getHistory(operationId) {
        return this.retryHistory.get(operationId);
    }
    clearHistory(operationId) {
        if (operationId) {
            this.retryHistory.delete(operationId);
        }
        else {
            this.retryHistory.clear();
        }
    }
}
exports.RetryEngine = RetryEngine;
exports.globalRetryEngine = new RetryEngine();
//# sourceMappingURL=retryEngine.js.map