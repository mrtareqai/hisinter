/**
 * Autonomous Recovery System
 * Detects failures and automatically applies recovery strategies
 */

export interface RecoveryStrategy {
    name: string;
    description: string;
    apply: () => Promise<boolean>;
    priority: number;
}

export interface FailureEvent {
    type: string;
    message: string;
    timestamp: number;
    context?: Record<string, any>;
}

export enum RecoveryMode {
    PASSIVE = 'passive', // Log failures only
    ACTIVE = 'active',   // Auto-apply non-destructive recoveries
    AGGRESSIVE = 'aggressive', // Apply more aggressive strategies
}

export class AutonomousRecovery {
    private failureHistory: FailureEvent[] = [];
    private recoveryStrategies: RecoveryStrategy[] = [];
    private mode: RecoveryMode = RecoveryMode.ACTIVE;
    private failureThreshold = 3;
    private recoverySuccess = 0;
    private recoveryFailures = 0;

    setMode(mode: RecoveryMode): void {
        this.mode = mode;
    }

    registerStrategy(strategy: RecoveryStrategy): void {
        this.recoveryStrategies.push(strategy);
        this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
    }

    async handleFailure(event: FailureEvent): Promise<boolean> {
        this.failureHistory.push(event);

        if (this.failureHistory.length > 100) {
            this.failureHistory.shift();
        }

        // Check if we're in a failure loop
        if (this.isFailureLoop()) {
            console.warn('[Recovery] Failure loop detected, entering safe mode');
            return false;
        }

        if (this.mode === RecoveryMode.PASSIVE) {
            return false;
        }

        // Try recovery strategies
        for (const strategy of this.recoveryStrategies) {
            if (strategy.name.match(this.getStrategyPattern(event.type))) {
                try {
                    const success = await strategy.apply();
                    if (success) {
                        this.recoverySuccess++;
                        console.log(`[Recovery] ${strategy.name} succeeded`);
                        return true;
                    }
                } catch (error) {
                    this.recoveryFailures++;
                    console.error(`[Recovery] ${strategy.name} failed:`, error);
                }
            }
        }

        return false;
    }

    private isFailureLoop(): boolean {
        const recentFailures = this.failureHistory.slice(-this.failureThreshold);
        
        if (recentFailures.length < this.failureThreshold) {
            return false;
        }

        // Check if all recent failures are the same type within 1 minute
        const lastMinute = Date.now() - 60000;
        const recentSameTypeFailures = recentFailures.filter(f => f.timestamp > lastMinute);

        if (recentSameTypeFailures.length === 0) {
            return false;
        }

        return recentSameTypeFailures.every(f => f.type === recentFailures[0].type);
    }

    private getStrategyPattern(failureType: string): RegExp {
        const patterns: Record<string, string> = {
            'network': 'retry|network|timeout|connection',
            'model': 'model|inference|llm|rate-limit',
            'memory': 'oom|memory|stack|heap',
            'file': 'file|permission|exists|write',
            'timeout': 'timeout|slow|hang|stuck',
        };

        const pattern = patterns[failureType] || failureType;
        return new RegExp(pattern, 'i');
    }

    getFailureHistory(): FailureEvent[] {
        return [...this.failureHistory];
    }

    getRecoveryStats() {
        return {
            totalFailures: this.failureHistory.length,
            successfulRecoveries: this.recoverySuccess,
            failedRecoveries: this.recoveryFailures,
            successRate: this.recoverySuccess + this.recoveryFailures > 0
                ? this.recoverySuccess / (this.recoverySuccess + this.recoveryFailures)
                : 0,
            mode: this.mode,
        };
    }

    clearHistory(): void {
        this.failureHistory = [];
        this.recoverySuccess = 0;
        this.recoveryFailures = 0;
    }
}

export const globalRecoverySystem = new AutonomousRecovery();
