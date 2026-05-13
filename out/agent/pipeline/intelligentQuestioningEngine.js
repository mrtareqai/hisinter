"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligentQuestioningEngine = void 0;
/**
 * IntelligentQuestioningEngine
 * Generates minimal, context-aware clarification questions
 * Only asks when truly necessary (gap analysis)
 */
class IntelligentQuestioningEngine {
    questionHistory;
    questionTemplates = {
        missingScope: `Should I focus on {scope}? Or did you mean something broader/narrower?`,
        ambiguousFramework: `I see two possible approaches: {option1} or {option2}. Which fits your needs?`,
        dependencyConfirmation: `This will need {dependency}. Should I set that up automatically?`,
        scaleConfirmation: `This looks like a {size} project. Should I plan accordingly?`,
        languageChoice: `What programming language would you prefer? {languages}`,
        frameworkChoice: `Which framework appeals to you? {frameworks}`,
        priorityConfirmation: `I've prioritized these steps: {steps}. Does that order work for you?`,
        riskAcknowledgement: `This involves {riskArea}. Are you comfortable with that?`,
    };
    constructor() {
        this.questionHistory = [];
    }
    /**
     * Analyze goal decomposition for gaps
     */
    detectGaps(goalTree) {
        const gaps = [];
        // Check for missing scope clarification
        if (!goalTree.scopeDefinition || goalTree.scopeDefinition.clarity < 0.7) {
            gaps.push({
                type: 'missing_scope',
                severity: 'critical',
            });
        }
        // Check for ambiguous framework choice
        if (goalTree.requiresFramework && !goalTree.frameworkSelected) {
            gaps.push({
                type: 'ambiguous_framework',
                severity: 'critical',
            });
        }
        // Check for missing dependencies
        if (goalTree.dependencies &&
            goalTree.dependencies.filter((d) => !d.confirmed).length > 0) {
            gaps.push({
                type: 'dependency_confirmation',
                severity: 'moderate',
            });
        }
        // Check for scale uncertainty
        if (!goalTree.estimatedScale || goalTree.estimatedScale === 'unknown') {
            gaps.push({
                type: 'scale_confirmation',
                severity: 'moderate',
            });
        }
        return gaps;
    }
    /**
     * Generate minimal questions from gaps
     */
    generateMinimalQuestions(gaps, goalTree) {
        const questions = [];
        // Only ask top 2-3 most critical questions
        const criticalGaps = gaps.filter((g) => g.severity === 'critical');
        const topGaps = criticalGaps.length > 0 ? criticalGaps : gaps;
        for (const gap of topGaps.slice(0, 3)) {
            const question = this.generateQuestionForGap(gap, goalTree);
            if (question) {
                questions.push(question);
            }
        }
        return questions;
    }
    /**
     * Generate specific question for gap
     */
    generateQuestionForGap(gap, goalTree) {
        switch (gap.type) {
            case 'missing_scope':
                return this.interpolate(this.questionTemplates.missingScope, { scope: goalTree.suggestedScope || 'web application' });
            case 'ambiguous_framework':
                return this.interpolate(this.questionTemplates.frameworkChoice, {
                    frameworks: this.listFrameworks(goalTree.language),
                });
            case 'dependency_confirmation':
                const unconfirmed = goalTree.dependencies
                    .filter((d) => !d.confirmed)
                    .slice(0, 2);
                return this.interpolate(this.questionTemplates.dependencyConfirmation, {
                    dependency: unconfirmed.map((d) => d.name).join(' and '),
                });
            case 'scale_confirmation':
                return this.interpolate(this.questionTemplates.scaleConfirmation, {
                    size: goalTree.estimatedGoals?.length || 5 > 10 ? 'large' : 'medium',
                });
            case 'language_choice':
                return this.interpolate(this.questionTemplates.languageChoice, {
                    languages: 'JavaScript, Python, Go, or something else?',
                });
            default:
                return '';
        }
    }
    /**
     * Ask user a question and record response
     */
    async askQuestion(question, context) {
        this.questionHistory.push({
            timestamp: Date.now(),
            question,
        });
        // In real implementation, this would wait for user input
        // For now, return placeholder
        return {
            question,
            answer: 'user_response_placeholder',
            confidence: 0.7,
        };
    }
    /**
     * List available frameworks for language
     */
    listFrameworks(language) {
        const frameworks = {
            javascript: ['React', 'Vue', 'Svelte', 'Next.js'],
            python: ['Django', 'FastAPI', 'Flask'],
            go: ['Gin', 'Echo', 'Fiber'],
            rust: ['Actix', 'Axum', 'Rocket'],
        };
        const lang = language?.toLowerCase() || 'javascript';
        return (frameworks[lang] || frameworks.javascript).join(', ');
    }
    /**
     * Check if questions were already asked and answered
     */
    getAnsweredContext() {
        const context = {};
        for (const entry of this.questionHistory) {
            if (entry.answer) {
                const questionType = this.parseQuestionType(entry.question);
                context[questionType] = entry.answer;
            }
        }
        return context;
    }
    /**
     * Parse question type from question text
     */
    parseQuestionType(question) {
        if (question.includes('focus on'))
            return 'scope';
        if (question.includes('approach'))
            return 'framework';
        if (question.includes('language'))
            return 'language';
        if (question.includes('framework'))
            return 'framework';
        if (question.includes('dependency'))
            return 'dependencies';
        if (question.includes('project'))
            return 'scale';
        return 'other';
    }
    /**
     * Should ask for clarification?
     */
    shouldAsk(gaps) {
        // Only ask if there are critical gaps without answers
        return gaps.some((g) => g.severity === 'critical' && !this.getAnsweredContext()[g.type]);
    }
    /**
     * Get question history
     */
    getQuestionHistory() {
        return this.questionHistory;
    }
    /**
     * Interpolate variables in templates
     */
    interpolate(template, vars) {
        let result = template;
        for (const [key, value] of Object.entries(vars)) {
            result = result.replace(`{${key}}`, String(value));
        }
        return result;
    }
    /**
     * Clear history
     */
    clearHistory() {
        this.questionHistory = [];
    }
}
exports.IntelligentQuestioningEngine = IntelligentQuestioningEngine;
exports.default = IntelligentQuestioningEngine;
//# sourceMappingURL=intelligentQuestioningEngine.js.map