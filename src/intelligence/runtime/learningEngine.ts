import * as fs from 'fs';
import * as path from 'path';
import { ExecutionFeedback } from './feedbackCollector';
import { ValidationResult } from './validationOrchestrator';

/**
 * Learning data structure to update intelligence systems
 */
export interface LearningUpdate {
  id: string;
  timestamp: number;
  sourceType: 'success' | 'failure' | 'anomaly';
  pattern: {
    toolName: string;
    inputSignature: string;
    outcomePattern: string;
    confidence: number;
  };
  impact: {
    affectedSystems: string[];
    predictionAccuracyDelta: number;
    performanceDelta: number;
  };
  applicableContext: {
    projectType?: string;
    complexity?: string;
    constraints?: string[];
  };
}

/**
 * LearningEngine processes validated feedback to update intelligence systems
 */
export class LearningEngine {
  private learningHistory: LearningUpdate[] = [];
  private modelUpdates: Map<string, any> = new Map();
  private readonly persistencePath: string;
  private readonly maxLearningItems = 50000;

  constructor(persistencePath: string = './intelligence-learning') {
    this.persistencePath = persistencePath;
    this.initializePersistence();
  }

  /**
   * Process validated feedback to generate learning updates
   */
  async processValidatedFeedback(
    feedback: ExecutionFeedback,
    validation: ValidationResult
  ): Promise<LearningUpdate | null> {
    if (!validation.isValid) {
      console.log(
        `[v0] Skipping invalid feedback for learning: ${validation.failedRules.map((r) => r.name).join(', ')}`
      );
      return null;
    }

    const sourceType = this.determineSourceType(feedback, validation);
    const pattern = this.extractPattern(feedback);
    const impact = await this.estimateImpact(feedback, pattern);

    const update: LearningUpdate = {
      id: `learn-${feedback.id}`,
      timestamp: Date.now(),
      sourceType,
      pattern,
      impact,
      applicableContext: this.extractContext(feedback),
    };

    this.learningHistory.push(update);

    // Maintain size limit
    if (this.learningHistory.length > this.maxLearningItems) {
      this.learningHistory = this.learningHistory.slice(-this.maxLearningItems);
    }

    await this.persistLearning(update);
    return update;
  }

  /**
   * Batch process multiple validated feedbacks
   */
  async processBatchValidatedFeedback(
    feedbacks: ExecutionFeedback[],
    validations: ValidationResult[]
  ): Promise<LearningUpdate[]> {
    const updates: LearningUpdate[] = [];

    for (let i = 0; i < feedbacks.length; i++) {
      const update = await this.processValidatedFeedback(
        feedbacks[i],
        validations[i]
      );
      if (update) {
        updates.push(update);
      }
    }

    return updates;
  }

  /**
   * Update prediction model with new learning
   */
  async updatePredictionModel(update: LearningUpdate): Promise<void> {
    const toolKey = `prediction_${update.pattern.toolName}`;

    if (!this.modelUpdates.has(toolKey)) {
      this.modelUpdates.set(toolKey, {
        totalSamples: 0,
        successCount: 0,
        avgExecutionTime: 0,
        confidenceScores: [],
      });
    }

    const model = this.modelUpdates.get(toolKey);
    model.totalSamples++;

    if (update.sourceType === 'success') {
      model.successCount++;
    }

    // Update rolling average confidence
    model.confidenceScores.push(update.pattern.confidence);
    if (model.confidenceScores.length > 100) {
      model.confidenceScores.shift();
    }

    model.avgConfidence =
      model.confidenceScores.reduce((a, b) => a + b, 0) /
      model.confidenceScores.length;
  }

  /**
   * Update performance prediction model
   */
  async updatePerformanceModel(
    feedback: ExecutionFeedback,
    update: LearningUpdate
  ): Promise<void> {
    const perfKey = `perf_${feedback.toolName}`;

    if (!this.modelUpdates.has(perfKey)) {
      this.modelUpdates.set(perfKey, {
        executionTimes: [],
        successRates: [],
      });
    }

    const model = this.modelUpdates.get(perfKey);
    model.executionTimes.push(feedback.executionTimeMs);

    // Keep rolling window of recent executions
    if (model.executionTimes.length > 100) {
      model.executionTimes.shift();
    }

    model.avgExecutionTime =
      model.executionTimes.reduce((a, b) => a + b, 0) / model.executionTimes.length;
  }

  /**
   * Generate learning summary for intelligence systems
   */
  generateLearningSummary(): {
    totalLearning: number;
    successPatterns: LearningUpdate[];
    failurePatterns: LearningUpdate[];
    anomalies: LearningUpdate[];
    modelImprovements: Map<string, number>;
  } {
    const successes = this.learningHistory.filter((l) => l.sourceType === 'success');
    const failures = this.learningHistory.filter((l) => l.sourceType === 'failure');
    const anomalies = this.learningHistory.filter((l) => l.sourceType === 'anomaly');

    const improvements: Map<string, number> = new Map();
    this.modelUpdates.forEach((model, key) => {
      const successRate =
        model.totalSamples > 0 ? model.successCount / model.totalSamples : 0;
      improvements.set(key, successRate);
    });

    return {
      totalLearning: this.learningHistory.length,
      successPatterns: successes,
      failurePatterns: failures,
      anomalies,
      modelImprovements: improvements,
    };
  }

  /**
   * Get applicable learning for a specific context
   */
  getApplicableLearning(context: {
    toolName: string;
    projectType?: string;
    complexity?: string;
  }): LearningUpdate[] {
    return this.learningHistory.filter((update) => {
      if (update.pattern.toolName !== context.toolName) return false;
      if (
        context.projectType &&
        update.applicableContext.projectType &&
        update.applicableContext.projectType !== context.projectType
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * Export models for integration with other systems
   */
  exportModels(): Record<string, any> {
    const models: Record<string, any> = {};
    this.modelUpdates.forEach((value, key) => {
      models[key] = value;
    });
    return models;
  }

  /**
   * Private helper methods
   */
  private determineSourceType(
    feedback: ExecutionFeedback,
    validation: ValidationResult
  ): 'success' | 'failure' | 'anomaly' {
    if (feedback.success && validation.validationScore >= 0.8) {
      return 'success';
    }
    if (!feedback.success) {
      return 'failure';
    }
    if (validation.validationScore < 0.5) {
      return 'anomaly';
    }
    return 'success';
  }

  private extractPattern(feedback: ExecutionFeedback): {
    toolName: string;
    inputSignature: string;
    outcomePattern: string;
    confidence: number;
  } {
    // Create signature from input parameters
    const inputSig = Object.keys(feedback.inputParameters)
      .sort()
      .map((k) => `${k}:${typeof feedback.inputParameters[k]}`)
      .join('|');

    // Extract outcome pattern
    const outcomeSig = feedback.outcomeAnalysis.expectedVsActual;

    return {
      toolName: feedback.toolName,
      inputSignature: inputSig,
      outcomePattern: outcomeSig,
      confidence: feedback.outcomeAnalysis.learningPotential,
    };
  }

  private async estimateImpact(
    feedback: ExecutionFeedback,
    pattern: any
  ): Promise<{
    affectedSystems: string[];
    predictionAccuracyDelta: number;
    performanceDelta: number;
  }> {
    // Determine which intelligence systems are affected
    const affectedSystems = this.getAffectedSystems(feedback.toolName);

    // Estimate prediction accuracy improvement
    const predictionDelta = feedback.outcomeAnalysis.learningPotential * 0.15; // Max 15% impact

    // Estimate performance improvement
    const perfDelta =
      feedback.executionTimeMs < 500
        ? 0.05
        : feedback.executionTimeMs > 5000
          ? -0.02
          : 0;

    return {
      affectedSystems,
      predictionAccuracyDelta: predictionDelta,
      performanceDelta: perfDelta,
    };
  }

  private getAffectedSystems(toolName: string): string[] {
    // Map tools to intelligence systems
    const systemMap: Record<string, string[]> = {
      'file-write': ['DeepReasoningEngine', 'PerformancePredictor'],
      'terminal-exec': ['ExecutionOptimizer', 'RiskAssessor'],
      'code-gen': ['DeepReasoningEngine', 'CodePatternAnalyzer'],
      'vscode-api': ['ToolIntelligence', 'ContextScoringSystem'],
    };

    return systemMap[toolName] || ['GeneralLearning'];
  }

  private extractContext(feedback: ExecutionFeedback): {
    projectType?: string;
    complexity?: string;
    constraints?: string[];
  } {
    return {
      complexity: feedback.executionTimeMs > 5000 ? 'high' : 'low',
      constraints: this.extractConstraints(feedback),
    };
  }

  private extractConstraints(feedback: ExecutionFeedback): string[] {
    const constraints: string[] = [];
    if (feedback.systemMetrics.memoryUsed > 500) constraints.push('high-memory');
    if (feedback.executionTimeMs > 10000) constraints.push('long-running');
    return constraints;
  }

  private async persistLearning(update: LearningUpdate): Promise<void> {
    const fileName = `learning-${update.id}.json`;
    const filePath = path.join(this.persistencePath, fileName);

    try {
      fs.writeFileSync(filePath, JSON.stringify(update, null, 2));
    } catch (error) {
      console.error('[v0] Failed to persist learning:', error);
    }
  }

  private initializePersistence(): void {
    if (!fs.existsSync(this.persistencePath)) {
      fs.mkdirSync(this.persistencePath, { recursive: true });
    }
  }

  getHistorySize(): number {
    return this.learningHistory.length;
  }

  clearHistory(): void {
    this.learningHistory = [];
    this.modelUpdates.clear();
  }
}
