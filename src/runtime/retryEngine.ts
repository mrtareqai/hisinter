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

export class RetryEngine {
    private defaultConfig: RetryConfig = {
        maxAttempts: 5,
        baseDelayMs: 100,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
        timeoutMs: 60000,
    };

    private retryHistory: Map<string, { attempts: number; lastError?: Error; lastAttemptTime: number }> = new Map();

    async execute<T>(
        operation: () => Promise<T>,
        operationId: string,
        config: Partial<RetryConfig> = {}
    ): Promise<RetryResult<T>> {
        const finalConfig = { ...this.defaultConfig, ...config };
        const startTime = performance.now();
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
            try {
                const result = await this.withTimeout(
                    operation(),
                    finalConfig.timeoutMs
                );

                // Success - record completion
                this.recordSuccess(operationId, attempt);

                return {
                    success: true,
                    data: result,
                    attempts: attempt,
                    totalTimeMs: performance.now() - startTime,
                };
            } catch (error) {
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
                const delayMs = this.calculateDelay(
                    attempt,
                    finalConfig.baseDelayMs,
                    finalConfig.maxDelayMs,
                    finalConfig.backoffMultiplier,
                    finalConfig.jitterFactor
                );

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

    private isRetryable(error: Error): boolean {
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

    private calculateDelay(
        attempt: number,
        baseDelay: number,
        maxDelay: number,
        multiplier: number,
        jitterFactor: number
    ): number {
        const exponentialDelay = baseDelay * Math.pow(multiplier, attempt - 1);
        const capped = Math.min(exponentialDelay, maxDelay);
        const jitter = capped * jitterFactor * Math.random();
        return capped + jitter;
    }

    private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
            ),
        ]);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private recordSuccess(operationId: string, attempts: number): void {
        const history = this.retryHistory.get(operationId);
        this.retryHistory.set(operationId, {
            attempts: history ? (history.attempts + attempts) / 2 : attempts,
            lastAttemptTime: Date.now(),
        });
    }

    private recordFailure(operationId: string, error: Error, attempts: number): void {
        this.retryHistory.set(operationId, {
            attempts,
            lastError: error,
            lastAttemptTime: Date.now(),
        });
    }

    getHistory(operationId: string) {
        return this.retryHistory.get(operationId);
    }

    clearHistory(operationId?: string): void {
        if (operationId) {
            this.retryHistory.delete(operationId);
        } else {
            this.retryHistory.clear();
        }
    }
}

export const globalRetryEngine = new RetryEngine();
