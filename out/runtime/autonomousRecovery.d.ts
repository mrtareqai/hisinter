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
export declare enum RecoveryMode {
    PASSIVE = "passive",// Log failures only
    ACTIVE = "active",// Auto-apply non-destructive recoveries
    AGGRESSIVE = "aggressive"
}
export declare class AutonomousRecovery {
    private failureHistory;
    private recoveryStrategies;
    private mode;
    private failureThreshold;
    private recoverySuccess;
    private recoveryFailures;
    setMode(mode: RecoveryMode): void;
    registerStrategy(strategy: RecoveryStrategy): void;
    handleFailure(event: FailureEvent): Promise<boolean>;
    private isFailureLoop;
    private getStrategyPattern;
    getFailureHistory(): FailureEvent[];
    getRecoveryStats(): {
        totalFailures: number;
        successfulRecoveries: number;
        failedRecoveries: number;
        successRate: number;
        mode: RecoveryMode;
    };
    clearHistory(): void;
}
export declare const globalRecoverySystem: AutonomousRecovery;
