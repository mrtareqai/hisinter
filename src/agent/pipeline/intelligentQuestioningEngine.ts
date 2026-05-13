/**
 * IntelligentQuestioningEngine
 * Generates minimal, context-aware clarification questions
 * Only asks when truly necessary (gap analysis)
 */
export class IntelligentQuestioningEngine {
  private questionHistory: Array<{
    timestamp: number;
    question: string;
    answer?: string;
  }>;

  private questionTemplates = {
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
  detectGaps(goalTree: any): Array<{
    type: string;
    severity: 'critical' | 'moderate' | 'minor';
    question?: string;
  }> {
    const gaps: Array<{
      type: string;
      severity: 'critical' | 'moderate' | 'minor';
      question?: string;
    }> = [];

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
    if (
      goalTree.dependencies &&
      goalTree.dependencies.filter((d: any) => !d.confirmed).length > 0
    ) {
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
  generateMinimalQuestions(gaps: any[], goalTree: any): string[] {
    const questions: string[] = [];

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
  private generateQuestionForGap(gap: any, goalTree: any): string {
    switch (gap.type) {
      case 'missing_scope':
        return this.interpolate(
          this.questionTemplates.missingScope,
          { scope: goalTree.suggestedScope || 'web application' }
        );

      case 'ambiguous_framework':
        return this.interpolate(
          this.questionTemplates.frameworkChoice,
          {
            frameworks: this.listFrameworks(goalTree.language),
          }
        );

      case 'dependency_confirmation':
        const unconfirmed = goalTree.dependencies
          .filter((d: any) => !d.confirmed)
          .slice(0, 2);
        return this.interpolate(
          this.questionTemplates.dependencyConfirmation,
          {
            dependency: unconfirmed.map((d: any) => d.name).join(' and '),
          }
        );

      case 'scale_confirmation':
        return this.interpolate(
          this.questionTemplates.scaleConfirmation,
          {
            size: goalTree.estimatedGoals?.length || 5 > 10 ? 'large' : 'medium',
          }
        );

      case 'language_choice':
        return this.interpolate(
          this.questionTemplates.languageChoice,
          {
            languages: 'JavaScript, Python, Go, or something else?',
          }
        );

      default:
        return '';
    }
  }

  /**
   * Ask user a question and record response
   */
  async askQuestion(
    question: string,
    context?: any
  ): Promise<{
    question: string;
    answer: string;
    confidence: number;
  }> {
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
  private listFrameworks(language?: string): string {
    const frameworks: Record<string, string[]> = {
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
  getAnsweredContext(): Record<string, string> {
    const context: Record<string, string> = {};

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
  private parseQuestionType(question: string): string {
    if (question.includes('focus on')) return 'scope';
    if (question.includes('approach')) return 'framework';
    if (question.includes('language')) return 'language';
    if (question.includes('framework')) return 'framework';
    if (question.includes('dependency')) return 'dependencies';
    if (question.includes('project')) return 'scale';
    return 'other';
  }

  /**
   * Should ask for clarification?
   */
  shouldAsk(gaps: any[]): boolean {
    // Only ask if there are critical gaps without answers
    return gaps.some(
      (g) => g.severity === 'critical' && !this.getAnsweredContext()[g.type]
    );
  }

  /**
   * Get question history
   */
  getQuestionHistory(): Array<{
    timestamp: number;
    question: string;
    answer?: string;
  }> {
    return this.questionHistory;
  }

  /**
   * Interpolate variables in templates
   */
  private interpolate(template: string, vars: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(`{${key}}`, String(value));
    }
    return result;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.questionHistory = [];
  }
}

export default IntelligentQuestioningEngine;
