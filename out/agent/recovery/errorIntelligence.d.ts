import { ExecutionError, ErrorType, ExecutionStep } from '../../types/agent';
export declare class ErrorIntelligence {
    private errorHistory;
    private recoveryStrategies;
    analyzeError(error: ExecutionError, step: ExecutionStep): ErrorAnalysis;
    suggestAutoFix(error: ExecutionError): string | null;
    private isRecurrentError;
    private findSimilarErrors;
    private getSuggestedRecoveries;
    private shouldRequestUserInput;
    private suggestSyntaxFix;
    private suggestPackageFix;
    private suggestDependencyFix;
    createUserFriendlyMessage(error: ExecutionError): string;
    getErrorContext(error: ExecutionError): ErrorContext;
    getAggregateErrorStats(): ErrorStats;
    private groupErrorsByType;
    private getMostCommonError;
    private calculateRecoveryRate;
    clearHistory(): void;
}
export interface ErrorAnalysis {
    error: ExecutionError;
    step: ExecutionStep;
    type: ErrorType;
    severity: 'critical' | 'warning' | 'info';
    isRecurrent: boolean;
    similarErrors: ExecutionError[];
    suggestedRecoveries: string[];
    canAutoRecover: boolean;
    shouldAskUser: boolean;
}
export interface ErrorContext {
    errorType: ErrorType;
    isRecurrent: boolean;
    previousOccurrences: number;
    timesSinceLastOccurrence: number;
    suggestedAction: string;
    commonFixes: string[];
}
export interface ErrorStats {
    totalErrors: number;
    criticalErrors: number;
    errorsByType: Record<ErrorType, number>;
    mostCommonError: ErrorType | null;
    recoveryRate: number;
}
export declare const createErrorIntelligence: () => ErrorIntelligence;
