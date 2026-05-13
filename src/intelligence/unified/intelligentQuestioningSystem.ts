import ProjectWorldModel from '../autonomy/projectWorldModel';

export interface Question {
  id: string;
  text: string;
  type: 'clarification' | 'confirmation' | 'choice' | 'input';
  options?: string[];
  importance: number;
  category: string;
}

export interface QuestioningContext {
  goal: string;
  missingInfo: string[];
  riskFactors: string[];
  dependencies: string[];
  ambiguities: string[];
}

/**
 * IntelligentQuestioningSystem - Minimal questions for maximum clarity
 * Asks only essential questions when confidence is 70-85%
 */
export class IntelligentQuestioningSystem {
  private worldModel: ProjectWorldModel;
  private questionCache: Map<string, Question[]> = new Map();

  constructor(worldModel: ProjectWorldModel) {
    this.worldModel = worldModel;
  }

  /**
   * Generate minimal questions for a goal
   */
  generateQuestions(goal: string, confidence: number): Question[] {
    // Only ask if confidence is between 70-85%
    if (confidence > 0.85 || confidence < 0.7) {
      return [];
    }

    const cacheKey = `${goal}-${confidence}`;
    if (this.questionCache.has(cacheKey)) {
      return this.questionCache.get(cacheKey) || [];
    }

    const context = this.analyzeGoal(goal);
    const questions = this.constructMinimalQuestions(context, goal);

    this.questionCache.set(cacheKey, questions);
    return questions;
  }

  /**
   * Analyze goal to understand what's missing
   */
  private analyzeGoal(goal: string): QuestioningContext {
    const projectIntel = this.worldModel.getProjectIntelligence();
    const lowerGoal = goal.toLowerCase();

    const missingInfo: string[] = [];
    const riskFactors: string[] = [];
    const dependencies: string[] = [];
    const ambiguities: string[] = [];

    // Check for missing scope
    if (!lowerGoal.includes('file') && !lowerGoal.includes('component')) {
      missingInfo.push('Which files or components?');
    }

    // Check for missing constraints
    if (
      !lowerGoal.includes('test') &&
      !lowerGoal.includes('check') &&
      projectIntel.errorPatterns.length > 0
    ) {
      riskFactors.push('Potential errors in similar operations');
    }

    // Check for ambiguous operations
    if (lowerGoal.includes('update') || lowerGoal.includes('change')) {
      ambiguities.push(
        'Scope of changes unclear - specific files or full refactor?'
      );
    }

    // Check for deployment operations
    if (
      lowerGoal.includes('deploy') ||
      lowerGoal.includes('publish') ||
      lowerGoal.includes('release')
    ) {
      riskFactors.push('This operation affects production');
      missingInfo.push('Confirmation required before proceeding');
    }

    return {
      goal,
      missingInfo,
      riskFactors,
      dependencies,
      ambiguities,
    };
  }

  /**
   * Construct minimal set of critical questions
   */
  private constructMinimalQuestions(
    context: QuestioningContext,
    goal: string
  ): Question[] {
    const questions: Question[] = [];
    let questionId = 0;

    // Critical clarification
    if (context.missingInfo.length > 0) {
      questions.push({
        id: `q-${questionId++}`,
        text: context.missingInfo[0],
        type: 'clarification',
        importance: 0.9,
        category: 'scope',
      });
    }

    // Risk confirmation
    if (context.riskFactors.length > 0) {
      questions.push({
        id: `q-${questionId++}`,
        text: `This operation has risks: ${context.riskFactors[0]}. Should I proceed?`,
        type: 'confirmation',
        options: ['Yes, proceed', 'No, cancel', 'Ask me later'],
        importance: 0.95,
        category: 'risk',
      });
    }

    // Ambiguity resolution (only if critical)
    if (context.ambiguities.length > 0 && context.ambiguities[0].length > 0) {
      questions.push({
        id: `q-${questionId++}`,
        text: context.ambiguities[0],
        type: 'choice',
        options: ['Specific files only', 'Full refactor', 'Tell me more'],
        importance: 0.8,
        category: 'scope',
      });
    }

    // Limit to max 3 questions
    return questions.slice(0, 3);
  }

  /**
   * Prioritize questions by importance and risk
   */
  prioritizeQuestions(questions: Question[]): Question[] {
    return questions.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Format questions for user display
   */
  formatForDisplay(questions: Question[]): string {
    if (questions.length === 0) return '';

    let output = 'I need clarification on a few points:\n\n';
    questions.forEach((q, idx) => {
      output += `${idx + 1}. ${q.text}\n`;
      if (q.options) {
        q.options.forEach((opt) => {
          output += `   - ${opt}\n`;
        });
      }
      output += '\n';
    });

    return output;
  }

  /**
   * Process user answers
   */
  processAnswers(
    answers: Map<string, string>
  ): {
    clarifications: Record<string, string>;
    risks: Record<string, string>;
    confidence: number;
  } {
    const clarifications: Record<string, string> = {};
    const risks: Record<string, string> = {};
    let confidenceBoost = 0;

    for (const [questionId, answer] of answers) {
      const category = questionId.split('-')[1];

      if (category === 'clarification' || category === 'scope') {
        clarifications[questionId] = answer;
        confidenceBoost += 0.15;
      } else if (category === 'risk') {
        risks[questionId] = answer;
        confidenceBoost += 0.2; // Risk answers more important
      }
    }

    return {
      clarifications,
      risks,
      confidence: Math.min(0.95, confidenceBoost),
    };
  }
}

export default IntelligentQuestioningSystem;
