"use strict";
/**
 * Autonomous Recovery System
 * Detects failures and automatically applies recovery strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalRecoverySystem = exports.AutonomousRecovery = exports.RecoveryMode = void 0;
var RecoveryMode;
(function (RecoveryMode) {
    RecoveryMode["PASSIVE"] = "passive";
    RecoveryMode["ACTIVE"] = "active";
    RecoveryMode["AGGRESSIVE"] = "aggressive";
})(RecoveryMode || (exports.RecoveryMode = RecoveryMode = {}));
class AutonomousRecovery {
    failureHistory = [];
    recoveryStrategies = [];
    mode = RecoveryMode.ACTIVE;
    failureThreshold = 3;
    recoverySuccess = 0;
    recoveryFailures = 0;
    setMode(mode) {
        this.mode = mode;
    }
    registerStrategy(strategy) {
        this.recoveryStrategies.push(strategy);
        this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
    }
    async handleFailure(event) {
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
                }
                catch (error) {
                    this.recoveryFailures++;
                    console.error(`[Recovery] ${strategy.name} failed:`, error);
                }
            }
        }
        return false;
    }
    isFailureLoop() {
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
    getStrategyPattern(failureType) {
        const patterns = {
            'network': 'retry|network|timeout|connection',
            'model': 'model|inference|llm|rate-limit',
            'memory': 'oom|memory|stack|heap',
            'file': 'file|permission|exists|write',
            'timeout': 'timeout|slow|hang|stuck',
        };
        const pattern = patterns[failureType] || failureType;
        return new RegExp(pattern, 'i');
    }
    getFailureHistory() {
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
    clearHistory() {
        this.failureHistory = [];
        this.recoverySuccess = 0;
        this.recoveryFailures = 0;
    }
}
exports.AutonomousRecovery = AutonomousRecovery;
exports.globalRecoverySystem = new AutonomousRecovery();
//# sourceMappingURL=autonomousRecovery.js.map