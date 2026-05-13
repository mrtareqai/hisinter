import { ExecutionError, ErrorType, ExecutionStep } from '../../types/agent';

export class ErrorIntelligence {
  private errorHistory: ExecutionError[] = [];
  private recoveryStrategies: Map<ErrorType, string[]> = new Map([
    [ErrorType.FILE_NOT_FOUND, [
      'Create the missing file',
      'Check the file path',
      'Search for similar files',
      'Ask user for location',
    ]],
    [ErrorType.PERMISSION_DENIED, [
      'Request elevated permissions',
      'Change file ownership',
      'Adjust access permissions',
      'Try alternative path',
    ]],
    [ErrorType.COMMAND_FAILED, [
      'Retry with different parameters',
      'Check command syntax',
      'Install missing dependencies',
      'Try alternative command',
    ]],
    [ErrorType.PACKAGE_NOT_FOUND, [
      'Verify package name',
      'Check package registry',
      'Try similar package',
      'Install from alternative source',
    ]],
    [ErrorType.SYNTAX_ERROR, [
      'Auto-fix syntax',
      'Provide correction',
      'Suggest common patterns',
      'Ask for clarification',
    ]],
    [ErrorType.DEPENDENCY_CONFLICT, [
      'Resolve version conflict',
      'Update dependencies',
      'Use compatible versions',
      'Ask user preference',
    ]],
    [ErrorType.TIMEOUT, [
      'Retry with longer timeout',
      'Break into smaller tasks',
      'Try offline method',
      'Skip this step',
    ]],
  ]);

  analyzeError(error: ExecutionError, step: ExecutionStep): ErrorAnalysis {
    this.errorHistory.push(error);

    const analysis: ErrorAnalysis = {
      error,
      step,
      type: error.type,
      severity: error.severity,
      isRecurrent: this.isRecurrentError(error),
      similarErrors: this.findSimilarErrors(error),
      suggestedRecoveries: this.getSuggestedRecoveries(error),
      canAutoRecover: error.recoverable,
      shouldAskUser: this.shouldRequestUserInput(error),
    };

    return analysis;
  }

  suggestAutoFix(error: ExecutionError): string | null {
    switch (error.type) {
      case ErrorType.SYNTAX_ERROR:
        return this.suggestSyntaxFix(error.message);

      case ErrorType.PACKAGE_NOT_FOUND:
        return this.suggestPackageFix(error.message);

      case ErrorType.TIMEOUT:
        return 'Retrying with increased timeout...';

      case ErrorType.DEPENDENCY_CONFLICT:
        return this.suggestDependencyFix(error.message);

      default:
        return null;
    }
  }

  private isRecurrentError(error: ExecutionError): boolean {
    const sameErrors = this.errorHistory.filter(
      (e) => e.type === error.type && e.message === error.message
    );
    return sameErrors.length > 1;
  }

  private findSimilarErrors(error: ExecutionError): ExecutionError[] {
    return this.errorHistory.filter((e) => e.type === error.type && e.id !== error.id);
  }

  private getSuggestedRecoveries(error: ExecutionError): string[] {
    const strategies = this.recoveryStrategies.get(error.type);
    return strategies || ['Manual intervention required'];
  }

  private shouldRequestUserInput(error: ExecutionError): boolean {
    const autoRecoverableTypes = [ErrorType.TIMEOUT, ErrorType.COMMAND_FAILED];
    return !autoRecoverableTypes.includes(error.type);
  }

  private suggestSyntaxFix(message: string): string {
    if (message.includes('Unexpected token')) {
      return 'Missing comma, semicolon, or bracket detected. Auto-fixing...';
    }
    if (message.includes('Unexpected end')) {
      return 'Unclosed block detected. Adding closing bracket...';
    }
    return 'Syntax error detected. Let me fix that...';
  }

  private suggestPackageFix(message: string): string {
    if (message.includes('not found')) {
      const match = message.match(/(.+) not found/);
      if (match) {
        return `Package "${match[1]}" not found. Checking alternatives...`;
      }
    }
    return 'Package issue detected. Resolving...';
  }

  private suggestDependencyFix(message: string): string {
    if (message.includes('conflict')) {
      return 'Dependency version conflict detected. Resolving to compatible versions...';
    }
    return 'Dependency issue detected. Resolving...';
  }

  createUserFriendlyMessage(error: ExecutionError): string {
    const friendlyMessages: Record<ErrorType, string> = {
      [ErrorType.FILE_NOT_FOUND]: "I couldn't find a file I need. Let me create it for you.",
      [ErrorType.PERMISSION_DENIED]: "I don't have permission to access that file. Let me work around it.",
      [ErrorType.COMMAND_FAILED]: "A command failed. I'll try a different approach.",
      [ErrorType.PACKAGE_NOT_FOUND]: "A package isn't available. Let me find an alternative.",
      [ErrorType.SYNTAX_ERROR]: 'I found a syntax issue. Let me fix it.',
      [ErrorType.DEPENDENCY_CONFLICT]: 'There\'s a version conflict. I\'ll resolve it.',
      [ErrorType.TIMEOUT]: "Something took too long. Let me try again.",
      [ErrorType.UNKNOWN]: 'Something went wrong. Let me investigate.',
    };

    return friendlyMessages[error.type] || 'An error occurred. Let me handle it.';
  }

  getErrorContext(error: ExecutionError): ErrorContext {
    const similarErrors = this.findSimilarErrors(error);
    const lastSimilar = similarErrors[similarErrors.length - 1];

    return {
      errorType: error.type,
      isRecurrent: this.isRecurrentError(error),
      previousOccurrences: similarErrors.length,
      timesSinceLastOccurrence: lastSimilar ? Date.now() - lastSimilar.id.length : -1,
      suggestedAction: error.suggestion,
      commonFixes: this.getSuggestedRecoveries(error),
    };
  }

  getAggregateErrorStats(): ErrorStats {
    return {
      totalErrors: this.errorHistory.length,
      criticalErrors: this.errorHistory.filter((e) => e.severity === 'critical').length,
      errorsByType: this.groupErrorsByType(),
      mostCommonError: this.getMostCommonError(),
      recoveryRate: this.calculateRecoveryRate(),
    };
  }

  private groupErrorsByType(): Record<ErrorType, number> {
    const grouped: Record<ErrorType, number> = {} as Record<ErrorType, number>;

    for (const error of this.errorHistory) {
      grouped[error.type] = (grouped[error.type] || 0) + 1;
    }

    return grouped;
  }

  private getMostCommonError(): ErrorType | null {
    const grouped = this.groupErrorsByType();
    let max = 0;
    let mostCommon: ErrorType | null = null;

    for (const [type, count] of Object.entries(grouped)) {
      if (count > max) {
        max = count;
        mostCommon = type as ErrorType;
      }
    }

    return mostCommon;
  }

  private calculateRecoveryRate(): number {
    if (this.errorHistory.length === 0) return 1.0;

    const recovered = this.errorHistory.filter((e) => e.recoverable).length;
    return recovered / this.errorHistory.length;
  }

  clearHistory(): void {
    this.errorHistory = [];
  }
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

export const createErrorIntelligence = (): ErrorIntelligence => {
  return new ErrorIntelligence();
};
