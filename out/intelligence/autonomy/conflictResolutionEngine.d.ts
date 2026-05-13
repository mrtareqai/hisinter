export type ConflictType = 'file-modification' | 'dependency-version' | 'prediction-mismatch' | 'resource-exhaustion' | 'timeout' | 'version-conflict' | 'state-inconsistency' | 'unknown';
export type ResolutionStrategy = 'merge' | 'revert' | 'renegotiate' | 'rollback' | 'retry' | 'skip';
export interface Conflict {
    id: string;
    type: ConflictType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: number;
    context: Record<string, unknown>;
    affectedGoals: string[];
    suggestedResolutions: Array<{
        strategy: ResolutionStrategy;
        confidence: number;
        sideEffects: string[];
    }>;
    resolved: boolean;
    resolution?: {
        strategy: ResolutionStrategy;
        appliedAt: number;
        success: boolean;
        details: Record<string, unknown>;
    };
}
export interface ResolutionStrategy {
    type: ResolutionStrategy;
    description: string;
    rollbackCapability: boolean;
    estimatedDuration: number;
    successProbability: number;
}
export default class ConflictResolutionEngine {
    private conflicts;
    private resolutionHistory;
    /**
     * Detect and classify a conflict
     */
    detectConflict(error: Error, context: Record<string, unknown>, affectedGoals: string[]): Conflict;
    /**
     * Classify conflict type from error
     */
    private classifyConflict;
    /**
     * Assess conflict severity
     */
    private assessSeverity;
    /**
     * Suggest resolution strategies for a conflict
     */
    private suggestResolutions;
    /**
     * Autonomously resolve a conflict
     */
    resolveConflict(conflictId: string, preferredStrategy?: ResolutionStrategy): {
        success: boolean;
        details: Record<string, unknown>;
    };
    /**
     * Apply a resolution strategy
     */
    private applyResolution;
    /**
     * Get conflict by ID
     */
    getConflict(conflictId: string): Conflict | undefined;
    /**
     * Get all active (unresolved) conflicts
     */
    getActiveConflicts(): Conflict[];
    /**
     * Get resolution statistics
     */
    getStatistics(): {
        totalConflicts: number;
        resolvedConflicts: number;
        resolutionSuccessRate: number;
        averageResolutionTime: number;
        mostCommonType: ConflictType;
        mostEffectiveStrategy: ResolutionStrategy;
    };
    /**
     * Export conflict history for analytics
     */
    getHistory(): Array<{
        conflictId: string;
        strategy: ResolutionStrategy;
        success: boolean;
        duration: number;
    }>;
    /**
     * Clear history
     */
    clearHistory(): void;
}
