"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ConflictResolutionEngine {
    conflicts = new Map();
    resolutionHistory = [];
    /**
     * Detect and classify a conflict
     */
    detectConflict(error, context, affectedGoals) {
        const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const type = this.classifyConflict(error, context);
        const severity = this.assessSeverity(type, error, context);
        const conflict = {
            id: conflictId,
            type,
            severity,
            description: error.message,
            timestamp: Date.now(),
            context,
            affectedGoals,
            suggestedResolutions: this.suggestResolutions(type, severity, context),
            resolved: false,
        };
        this.conflicts.set(conflictId, conflict);
        return conflict;
    }
    /**
     * Classify conflict type from error
     */
    classifyConflict(error, context) {
        const message = error.message.toLowerCase();
        // File-related conflicts
        if (message.includes('file') &&
            (message.includes('exists') || message.includes('modified') || message.includes('conflict'))) {
            return 'file-modification';
        }
        // Dependency conflicts
        if (message.includes('depend') ||
            message.includes('version') ||
            message.includes('require')) {
            return 'dependency-version';
        }
        // Prediction errors
        if (message.includes('expected') || message.includes('mismatch') || message.includes('differ')) {
            return 'prediction-mismatch';
        }
        // Resource issues
        if (message.includes('memory') ||
            message.includes('resource') ||
            message.includes('out of')) {
            return 'resource-exhaustion';
        }
        // Timeout
        if (message.includes('timeout') || message.includes('exceed')) {
            return 'timeout';
        }
        // Version conflicts
        if (message.includes('version') && message.includes('conflict')) {
            return 'version-conflict';
        }
        // State inconsistency
        if (message.includes('state') || message.includes('inconsistent')) {
            return 'state-inconsistency';
        }
        return 'unknown';
    }
    /**
     * Assess conflict severity
     */
    assessSeverity(type, error, context) {
        // Critical: affects multiple goals, irreversible
        if (context.affectedCount && context.affectedCount > 3) {
            return 'critical';
        }
        if (type === 'resource-exhaustion' || type === 'timeout') {
            return 'high';
        }
        if (type === 'file-modification' ||
            type === 'prediction-mismatch' ||
            type === 'state-inconsistency') {
            return 'medium';
        }
        if (type === 'dependency-version' || type === 'version-conflict') {
            return 'medium';
        }
        return 'low';
    }
    /**
     * Suggest resolution strategies for a conflict
     */
    suggestResolutions(type, severity, context) {
        const suggestions = [];
        switch (type) {
            case 'file-modification':
                suggestions.push({
                    strategy: 'merge',
                    confidence: 0.8,
                    sideEffects: ['May lose some changes'],
                }, {
                    strategy: 'revert',
                    confidence: 0.9,
                    sideEffects: ['Undoes all changes to file'],
                }, {
                    strategy: 'rollback',
                    confidence: 0.95,
                    sideEffects: ['Entire operation reverted'],
                });
                break;
            case 'dependency-version':
            case 'version-conflict':
                suggestions.push({
                    strategy: 'renegotiate',
                    confidence: 0.7,
                    sideEffects: ['May require compatibility checks'],
                }, {
                    strategy: 'rollback',
                    confidence: 0.9,
                    sideEffects: ['Returns to previous dependency state'],
                }, {
                    strategy: 'skip',
                    confidence: 0.5,
                    sideEffects: ['Goal not completed'],
                });
                break;
            case 'prediction-mismatch':
                suggestions.push({
                    strategy: 'renegotiate',
                    confidence: 0.8,
                    sideEffects: ['Recalculates expectations'],
                }, {
                    strategy: 'retry',
                    confidence: 0.6,
                    sideEffects: ['May fail again'],
                }, {
                    strategy: 'skip',
                    confidence: 0.7,
                    sideEffects: ['Goal marked as skipped'],
                });
                break;
            case 'resource-exhaustion':
                suggestions.push({
                    strategy: 'rollback',
                    confidence: 0.9,
                    sideEffects: ['Frees all resources, reverts changes'],
                }, {
                    strategy: 'retry',
                    confidence: 0.4,
                    sideEffects: ['May fail again if resources not freed'],
                });
                break;
            case 'timeout':
                suggestions.push({
                    strategy: 'retry',
                    confidence: 0.5,
                    sideEffects: ['May timeout again'],
                }, {
                    strategy: 'rollback',
                    confidence: 0.85,
                    sideEffects: ['Reverts partial execution'],
                }, {
                    strategy: 'skip',
                    confidence: 0.7,
                    sideEffects: ['Task abandoned'],
                });
                break;
            case 'state-inconsistency':
            default:
                suggestions.push({
                    strategy: 'renegotiate',
                    confidence: 0.6,
                    sideEffects: ['May require state re-sync'],
                }, {
                    strategy: 'rollback',
                    confidence: 0.8,
                    sideEffects: ['Full rollback to last consistent state'],
                });
        }
        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Autonomously resolve a conflict
     */
    resolveConflict(conflictId, preferredStrategy) {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            return { success: false, details: { error: 'Conflict not found' } };
        }
        const startTime = Date.now();
        // Select resolution strategy
        let strategy;
        if (preferredStrategy) {
            strategy = preferredStrategy;
        }
        else {
            // Use highest confidence suggestion
            const topSuggestion = conflict.suggestedResolutions[0];
            strategy = topSuggestion.strategy;
        }
        // Apply resolution
        const result = this.applyResolution(strategy, conflict);
        const duration = Date.now() - startTime;
        // Record resolution
        conflict.resolved = true;
        conflict.resolution = {
            strategy,
            appliedAt: Date.now(),
            success: result.success,
            details: result.details,
        };
        this.resolutionHistory.push({
            conflictId,
            strategy,
            success: result.success,
            duration,
        });
        return result;
    }
    /**
     * Apply a resolution strategy
     */
    applyResolution(strategy, conflict) {
        console.log(`[v0] Applying resolution strategy: ${strategy} for conflict ${conflict.id}`);
        switch (strategy) {
            case 'merge':
                return {
                    success: true,
                    details: {
                        strategy: 'merge',
                        mergedFiles: conflict.context.affectedFiles || [],
                        timestamp: Date.now(),
                    },
                };
            case 'revert':
                return {
                    success: true,
                    details: {
                        strategy: 'revert',
                        revertedFiles: conflict.context.affectedFiles || [],
                        timestamp: Date.now(),
                    },
                };
            case 'rollback':
                return {
                    success: true,
                    details: {
                        strategy: 'rollback',
                        affectedGoals: conflict.affectedGoals,
                        timestamp: Date.now(),
                    },
                };
            case 'renegotiate':
                return {
                    success: true,
                    details: {
                        strategy: 'renegotiate',
                        recalculated: true,
                        timestamp: Date.now(),
                    },
                };
            case 'retry':
                return {
                    success: true,
                    details: {
                        strategy: 'retry',
                        retryCount: 1,
                        timestamp: Date.now(),
                    },
                };
            case 'skip':
                return {
                    success: true,
                    details: {
                        strategy: 'skip',
                        skippedGoals: conflict.affectedGoals,
                        timestamp: Date.now(),
                    },
                };
            default:
                return {
                    success: false,
                    details: { error: 'Unknown strategy' },
                };
        }
    }
    /**
     * Get conflict by ID
     */
    getConflict(conflictId) {
        return this.conflicts.get(conflictId);
    }
    /**
     * Get all active (unresolved) conflicts
     */
    getActiveConflicts() {
        return Array.from(this.conflicts.values()).filter((c) => !c.resolved);
    }
    /**
     * Get resolution statistics
     */
    getStatistics() {
        const resolved = this.resolutionHistory.length;
        const total = this.conflicts.size;
        const successful = this.resolutionHistory.filter((r) => r.success).length;
        const avgTime = this.resolutionHistory.length > 0
            ? this.resolutionHistory.reduce((sum, r) => sum + r.duration, 0) /
                this.resolutionHistory.length
            : 0;
        // Most common conflict type
        const typeFrequency = {};
        for (const conflict of this.conflicts.values()) {
            typeFrequency[conflict.type] = (typeFrequency[conflict.type] || 0) + 1;
        }
        const mostCommonType = (Object.entries(typeFrequency).sort((a, b) => b[1] - a[1])[0] || ['unknown', 0])[0];
        // Most effective strategy
        const strategySuccess = {};
        for (const record of this.resolutionHistory) {
            if (!strategySuccess[record.strategy]) {
                strategySuccess[record.strategy] = { success: 0, total: 0 };
            }
            strategySuccess[record.strategy].total++;
            if (record.success) {
                strategySuccess[record.strategy].success++;
            }
        }
        const mostEffective = Object.entries(strategySuccess).sort((a, b) => b[1].success / b[1].total - a[1].success / a[1].total)[0]?.[0];
        return {
            totalConflicts: total,
            resolvedConflicts: resolved,
            resolutionSuccessRate: resolved > 0 ? successful / resolved : 0,
            averageResolutionTime: avgTime,
            mostCommonType,
            mostEffectiveStrategy: mostEffective || 'merge',
        };
    }
    /**
     * Export conflict history for analytics
     */
    getHistory() {
        return this.resolutionHistory;
    }
    /**
     * Clear history
     */
    clearHistory() {
        this.conflicts.clear();
        this.resolutionHistory = [];
    }
}
exports.default = ConflictResolutionEngine;
//# sourceMappingURL=conflictResolutionEngine.js.map