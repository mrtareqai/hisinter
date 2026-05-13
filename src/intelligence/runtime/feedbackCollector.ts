import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ExecutionRecord } from './executionAdapter';

/**
 * Comprehensive feedback data structure from execution
 */
export interface ExecutionFeedback {
  id: string;
  executionRecordId: string;
  timestamp: number;
  toolName: string;
  inputParameters: Record<string, unknown>;
  outputResult: string;
  success: boolean;
  executionTimeMs: number;
  systemMetrics: {
    memoryUsed: number;
    cpuLoad: number;
    diskIO: string;
  };
  outcomeAnalysis: {
    expectedVsActual: string;
    surpriseFactor: number; // 0-1, how unexpected was the outcome
    learningPotential: number; // 0-1, how much can we learn
  };
  environmentState: {
    projectStructure: string;
    fileSystemState: Record<string, string>;
    errorContext: Record<string, unknown>;
  };
  feedbackChain: {
    previousExecutionId?: string;
    dependentExecutionId?: string;
    sequencePosition: number;
  };
}

/**
 * FeedbackCollector captures detailed execution feedback for learning
 */
export class FeedbackCollector {
  private feedbackHistory: ExecutionFeedback[] = [];
  private readonly persistencePath: string;
  private readonly maxHistorySize = 10000;

  constructor(persistencePath: string = './intelligence-feedback') {
    this.persistencePath = persistencePath;
    this.initializePersistence();
  }

  /**
   * Collect comprehensive feedback from an execution record
   */
  async collectFeedback(
    record: ExecutionRecord,
    sequencePosition: number = 0,
    previousExecutionId?: string
  ): Promise<ExecutionFeedback> {
    const feedback: ExecutionFeedback = {
      id: uuidv4(),
      executionRecordId: record.context.predictionId,
      timestamp: Date.now(),
      toolName: record.context.toolName,
      inputParameters: record.context.arguments,
      outputResult: record.actualOutcome,
      success: record.success,
      executionTimeMs: record.executionTime,
      systemMetrics: this.captureSystemMetrics(),
      outcomeAnalysis: {
        expectedVsActual: this.compareOutcomes(
          record.context.expectedOutcome || '',
          record.actualOutcome
        ),
        surpriseFactor: this.calculateSurpriseFactor(record),
        learningPotential: record.feedbackRelevance,
      },
      environmentState: {
        projectStructure: this.captureProjectStructure(),
        fileSystemState: this.captureFileSystemState(),
        errorContext: this.captureErrorContext(record),
      },
      feedbackChain: {
        previousExecutionId,
        sequencePosition,
      },
    };

    this.feedbackHistory.push(feedback);

    // Maintain size limit
    if (this.feedbackHistory.length > this.maxHistorySize) {
      this.feedbackHistory = this.feedbackHistory.slice(-this.maxHistorySize);
    }

    return feedback;
  }

  /**
   * Batch collect feedback from multiple execution records
   */
  async collectBatchFeedback(
    records: ExecutionRecord[]
  ): Promise<ExecutionFeedback[]> {
    const feedbacks: ExecutionFeedback[] = [];

    for (let i = 0; i < records.length; i++) {
      const feedback = await this.collectFeedback(
        records[i],
        i,
        feedbacks[i - 1]?.id
      );
      feedbacks.push(feedback);
    }

    return feedbacks;
  }

  /**
   * Retrieve feedback by various criteria
   */
  getFeedbackByTool(toolName: string): ExecutionFeedback[] {
    return this.feedbackHistory.filter((f) => f.toolName === toolName);
  }

  getFeedbackBySuccessRate(minSuccess: number = 0.8): ExecutionFeedback[] {
    const successes = this.feedbackHistory.filter((f) => f.success);
    return successes;
  }

  getFeedbackByLearningPotential(minPotential: number = 0.6): ExecutionFeedback[] {
    return this.feedbackHistory.filter(
      (f) => f.outcomeAnalysis.learningPotential >= minPotential
    );
  }

  /**
   * Get recent feedback for a specific time window
   */
  getRecentFeedback(timeWindowMs: number = 3600000): ExecutionFeedback[] {
    const cutoffTime = Date.now() - timeWindowMs;
    return this.feedbackHistory.filter((f) => f.timestamp >= cutoffTime);
  }

  /**
   * Persist feedback to disk for long-term learning
   */
  async persistFeedback(feedback: ExecutionFeedback): Promise<void> {
    const fileName = `feedback-${feedback.id}.json`;
    const filePath = path.join(this.persistencePath, fileName);

    try {
      fs.writeFileSync(filePath, JSON.stringify(feedback, null, 2));
    } catch (error) {
      console.error('[v0] Failed to persist feedback:', error);
    }
  }

  /**
   * Load feedback from disk
   */
  async loadPersistedFeedback(feedbackId: string): Promise<ExecutionFeedback | null> {
    const filePath = path.join(this.persistencePath, `feedback-${feedbackId}.json`);

    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('[v0] Failed to load persisted feedback:', error);
    }

    return null;
  }

  /**
   * Generate feedback summary for analysis
   */
  generateFeedbackSummary(): {
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    highLearningItems: ExecutionFeedback[];
    failurePatterns: string[];
  } {
    const total = this.feedbackHistory.length;
    const successful = this.feedbackHistory.filter((f) => f.success).length;

    const avgTime =
      this.feedbackHistory.reduce((sum, f) => sum + f.executionTimeMs, 0) / total ||
      0;

    const highLearning = this.feedbackHistory
      .filter((f) => f.outcomeAnalysis.learningPotential >= 0.7)
      .sort(
        (a, b) =>
          b.outcomeAnalysis.learningPotential - a.outcomeAnalysis.learningPotential
      )
      .slice(0, 5);

    const failures = this.feedbackHistory.filter((f) => !f.success);
    const failurePatterns = this.analyzeFailurePatterns(failures);

    return {
      totalExecutions: total,
      successRate: total > 0 ? successful / total : 0,
      averageExecutionTime: avgTime,
      highLearningItems: highLearning,
      failurePatterns,
    };
  }

  /**
   * Private helper methods
   */
  private captureSystemMetrics() {
    return {
      memoryUsed: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuLoad: process.uptime(), // Simple proxy
      diskIO: 'monitored',
    };
  }

  private compareOutcomes(expected: string, actual: string): string {
    if (expected === actual) return 'MATCHED';
    if (actual.includes('SUCCESS') && expected.includes('SUCCESS')) return 'SIMILAR';
    if (actual.includes('ERROR') && expected.includes('ERROR')) return 'SIMILAR_FAILURE';
    return 'DIVERGED';
  }

  private calculateSurpriseFactor(record: ExecutionRecord): number {
    const expectedSuccess = record.context.confidence > 0.7;
    const actualSuccess = record.success;

    // Surprise when prediction was wrong
    if (expectedSuccess !== actualSuccess) {
      return 0.8;
    }

    // Surprise for unexpected timing
    if (record.executionTime > 10000 && record.context.confidence > 0.8) {
      return 0.5;
    }

    return 0.2;
  }

  private captureProjectStructure(): string {
    try {
      const structure = fs.readdirSync(process.cwd()).slice(0, 5).join(', ');
      return structure;
    } catch {
      return 'UNAVAILABLE';
    }
  }

  private captureFileSystemState(): Record<string, string> {
    const state: Record<string, string> = {};
    try {
      const files = fs.readdirSync(process.cwd());
      files.slice(0, 3).forEach((file) => {
        const stats = fs.statSync(path.join(process.cwd(), file));
        state[file] = stats.isDirectory() ? 'DIR' : 'FILE';
      });
    } catch {
      state['error'] = 'UNAVAILABLE';
    }
    return state;
  }

  private captureErrorContext(record: ExecutionRecord): Record<string, unknown> {
    if (record.success) {
      return {};
    }

    return {
      errorMessage: record.result.output,
      toolName: record.context.toolName,
      argumentSnapshot: record.context.arguments,
    };
  }

  private analyzeFailurePatterns(failures: ExecutionFeedback[]): string[] {
    const patterns: Map<string, number> = new Map();

    failures.forEach((f) => {
      const matches = f.outputResult.match(/ERROR: ([A-Z_]+)/);
      if (matches) {
        const pattern = matches[1];
        patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
      }
    });

    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([pattern]) => pattern)
      .slice(0, 5);
  }

  private initializePersistence(): void {
    if (!fs.existsSync(this.persistencePath)) {
      fs.mkdirSync(this.persistencePath, { recursive: true });
    }
  }

  getHistorySize(): number {
    return this.feedbackHistory.length;
  }

  clearHistory(): void {
    this.feedbackHistory = [];
  }
}
