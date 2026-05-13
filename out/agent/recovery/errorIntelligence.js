"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorIntelligence = exports.ErrorIntelligence = void 0;
const agent_1 = require("../../types/agent");
class ErrorIntelligence {
    errorHistory = [];
    recoveryStrategies = new Map([
        [agent_1.ErrorType.FILE_NOT_FOUND, [
                'Create the missing file',
                'Check the file path',
                'Search for similar files',
                'Ask user for location',
            ]],
        [agent_1.ErrorType.PERMISSION_DENIED, [
                'Request elevated permissions',
                'Change file ownership',
                'Adjust access permissions',
                'Try alternative path',
            ]],
        [agent_1.ErrorType.COMMAND_FAILED, [
                'Retry with different parameters',
                'Check command syntax',
                'Install missing dependencies',
                'Try alternative command',
            ]],
        [agent_1.ErrorType.PACKAGE_NOT_FOUND, [
                'Verify package name',
                'Check package registry',
                'Try similar package',
                'Install from alternative source',
            ]],
        [agent_1.ErrorType.SYNTAX_ERROR, [
                'Auto-fix syntax',
                'Provide correction',
                'Suggest common patterns',
                'Ask for clarification',
            ]],
        [agent_1.ErrorType.DEPENDENCY_CONFLICT, [
                'Resolve version conflict',
                'Update dependencies',
                'Use compatible versions',
                'Ask user preference',
            ]],
        [agent_1.ErrorType.TIMEOUT, [
                'Retry with longer timeout',
                'Break into smaller tasks',
                'Try offline method',
                'Skip this step',
            ]],
    ]);
    analyzeError(error, step) {
        this.errorHistory.push(error);
        const analysis = {
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
    suggestAutoFix(error) {
        switch (error.type) {
            case agent_1.ErrorType.SYNTAX_ERROR:
                return this.suggestSyntaxFix(error.message);
            case agent_1.ErrorType.PACKAGE_NOT_FOUND:
                return this.suggestPackageFix(error.message);
            case agent_1.ErrorType.TIMEOUT:
                return 'Retrying with increased timeout...';
            case agent_1.ErrorType.DEPENDENCY_CONFLICT:
                return this.suggestDependencyFix(error.message);
            default:
                return null;
        }
    }
    isRecurrentError(error) {
        const sameErrors = this.errorHistory.filter((e) => e.type === error.type && e.message === error.message);
        return sameErrors.length > 1;
    }
    findSimilarErrors(error) {
        return this.errorHistory.filter((e) => e.type === error.type && e.id !== error.id);
    }
    getSuggestedRecoveries(error) {
        const strategies = this.recoveryStrategies.get(error.type);
        return strategies || ['Manual intervention required'];
    }
    shouldRequestUserInput(error) {
        const autoRecoverableTypes = [agent_1.ErrorType.TIMEOUT, agent_1.ErrorType.COMMAND_FAILED];
        return !autoRecoverableTypes.includes(error.type);
    }
    suggestSyntaxFix(message) {
        if (message.includes('Unexpected token')) {
            return 'Missing comma, semicolon, or bracket detected. Auto-fixing...';
        }
        if (message.includes('Unexpected end')) {
            return 'Unclosed block detected. Adding closing bracket...';
        }
        return 'Syntax error detected. Let me fix that...';
    }
    suggestPackageFix(message) {
        if (message.includes('not found')) {
            const match = message.match(/(.+) not found/);
            if (match) {
                return `Package "${match[1]}" not found. Checking alternatives...`;
            }
        }
        return 'Package issue detected. Resolving...';
    }
    suggestDependencyFix(message) {
        if (message.includes('conflict')) {
            return 'Dependency version conflict detected. Resolving to compatible versions...';
        }
        return 'Dependency issue detected. Resolving...';
    }
    createUserFriendlyMessage(error) {
        const friendlyMessages = {
            [agent_1.ErrorType.FILE_NOT_FOUND]: "I couldn't find a file I need. Let me create it for you.",
            [agent_1.ErrorType.PERMISSION_DENIED]: "I don't have permission to access that file. Let me work around it.",
            [agent_1.ErrorType.COMMAND_FAILED]: "A command failed. I'll try a different approach.",
            [agent_1.ErrorType.PACKAGE_NOT_FOUND]: "A package isn't available. Let me find an alternative.",
            [agent_1.ErrorType.SYNTAX_ERROR]: 'I found a syntax issue. Let me fix it.',
            [agent_1.ErrorType.DEPENDENCY_CONFLICT]: 'There\'s a version conflict. I\'ll resolve it.',
            [agent_1.ErrorType.TIMEOUT]: "Something took too long. Let me try again.",
            [agent_1.ErrorType.UNKNOWN]: 'Something went wrong. Let me investigate.',
        };
        return friendlyMessages[error.type] || 'An error occurred. Let me handle it.';
    }
    getErrorContext(error) {
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
    getAggregateErrorStats() {
        return {
            totalErrors: this.errorHistory.length,
            criticalErrors: this.errorHistory.filter((e) => e.severity === 'critical').length,
            errorsByType: this.groupErrorsByType(),
            mostCommonError: this.getMostCommonError(),
            recoveryRate: this.calculateRecoveryRate(),
        };
    }
    groupErrorsByType() {
        const grouped = {};
        for (const error of this.errorHistory) {
            grouped[error.type] = (grouped[error.type] || 0) + 1;
        }
        return grouped;
    }
    getMostCommonError() {
        const grouped = this.groupErrorsByType();
        let max = 0;
        let mostCommon = null;
        for (const [type, count] of Object.entries(grouped)) {
            if (count > max) {
                max = count;
                mostCommon = type;
            }
        }
        return mostCommon;
    }
    calculateRecoveryRate() {
        if (this.errorHistory.length === 0)
            return 1.0;
        const recovered = this.errorHistory.filter((e) => e.recoverable).length;
        return recovered / this.errorHistory.length;
    }
    clearHistory() {
        this.errorHistory = [];
    }
}
exports.ErrorIntelligence = ErrorIntelligence;
const createErrorIntelligence = () => {
    return new ErrorIntelligence();
};
exports.createErrorIntelligence = createErrorIntelligence;
//# sourceMappingURL=errorIntelligence.js.map