import { ExecutionAdapter, ExecutionRecord } from './executionAdapter';
import { FeedbackCollector, ExecutionFeedback } from './feedbackCollector';
import { ValidationOrchestrator, ValidationResult } from './validationOrchestrator';
import { LearningEngine, LearningUpdate } from './learningEngine';
import { FilesystemMonitor, TerminalExecutor, VSCodeAPIAdapter } from './environmentAdapters';
import { IntelligenceOrchestrator } from '../orchestrator/intelligenceOrchestrator';
import { ToolRegistry } from '../../tools/toolRegistry';

/**
 * Execution cycle metrics
 */
export interface ExecutionCycleMetrics {
  cycleId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  executionRecords: number;
  feedbackCollected: number;
  feedbackValidated: number;
  learningUpdates: number;
  successRate: number;
}

/**
 * AutonomousRuntimeAgent orchestrates the complete execution-feedback-learning loop
 */
export class AutonomousRuntimeAgent {
  private executionAdapter: ExecutionAdapter;
  private feedbackCollector: FeedbackCollector;
  private validationOrchestrator: ValidationOrchestrator;
  private learningEngine: LearningEngine;
  private filesystemMonitor: FilesystemMonitor;
  private terminalExecutor: TerminalExecutor;
  private vscodeAdapter: VSCodeAPIAdapter;
  private intelligenceOrchestrator: IntelligenceOrchestrator;

  private cycleMetrics: ExecutionCycleMetrics[] = [];
  private isRunning = false;
  private cycleCallbacks: ((cycle: ExecutionCycleMetrics) => void)[] = [];

  constructor(
    toolRegistry: ToolRegistry,
    intelligenceOrchestrator: IntelligenceOrchestrator,
    workspacePath: string = process.cwd()
  ) {
    this.executionAdapter = new ExecutionAdapter(toolRegistry);
    this.feedbackCollector = new FeedbackCollector(
      `${workspacePath}/intelligence-feedback`
    );
    this.validationOrchestrator = new ValidationOrchestrator();
    this.learningEngine = new LearningEngine(
      `${workspacePath}/intelligence-learning`
    );
    this.filesystemMonitor = new FilesystemMonitor();
    this.terminalExecutor = new TerminalExecutor();
    this.vscodeAdapter = new VSCodeAPIAdapter();
    this.intelligenceOrchestrator = intelligenceOrchestrator;
  }

  /**
   * Start autonomous execution loop
   */
  async startAutonomousLoop(): Promise<void> {
    if (this.isRunning) {
      console.log('[v0] Autonomous loop already running');
      return;
    }

    this.isRunning = true;
    console.log('[v0] Starting autonomous runtime agent');

    // Watch filesystem for changes
    this.filesystemMonitor.watchDirectory(process.cwd(), (change) => {
      console.log(`[v0] Filesystem change: ${change.type} ${change.path}`);
    });

    // Start continuous execution cycles
    await this.continuousExecutionCycle();
  }

  /**
   * Stop autonomous loop
   */
  async stopAutonomousLoop(): Promise<void> {
    this.isRunning = false;
    this.filesystemMonitor.shutdown();
    console.log('[v0] Autonomous runtime agent stopped');
  }

  /**
   * Execute a single complete cycle: Predict → Execute → Collect → Validate → Learn
   */
  async executeCycle(
    taskDescription: string
  ): Promise<ExecutionCycleMetrics> {
    const cycleId = `cycle-${Date.now()}`;
    const metrics: ExecutionCycleMetrics = {
      cycleId,
      startTime: Date.now(),
      executionRecords: 0,
      feedbackCollected: 0,
      feedbackValidated: 0,
      learningUpdates: 0,
      successRate: 0,
    };

    try {
      console.log(`[v0] Starting execution cycle: ${cycleId}`);

      // Step 1: Get intelligence predictions
      const predictions = await this.intelligenceOrchestrator.orchestrate(
        taskDescription
      );

      if (!predictions.outputs || predictions.outputs.length === 0) {
        console.log('[v0] No predictions generated');
        return metrics;
      }

      // Step 2: Execute based on predictions
      const executionRecords = await this.executionAdapter.executeSequence(
        predictions.outputs,
        predictions.predictions
      );
      metrics.executionRecords = executionRecords.length;

      // Step 3: Collect feedback from execution
      const feedbacks = await this.feedbackCollector.collectBatchFeedback(
        executionRecords
      );
      metrics.feedbackCollected = feedbacks.length;

      // Step 4: Validate collected feedback
      const validations = await this.validationOrchestrator.validateBatch(
        feedbacks
      );
      const validFeedbacks = feedbacks.filter(
        (f, i) => validations[i].isValid
      );
      metrics.feedbackValidated = validFeedbacks.length;

      // Step 5: Learn from validated feedback
      const learningUpdates = await this.learningEngine.processBatchValidatedFeedback(
        validFeedbacks,
        validations.filter((v) => v.isValid)
      );
      metrics.learningUpdates = learningUpdates.length;

      // Step 6: Update intelligence models
      for (const update of learningUpdates) {
        await this.learningEngine.updatePredictionModel(update);
        for (let i = 0; i < feedbacks.length; i++) {
          if (feedbacks[i].id === update.sourceType) {
            await this.learningEngine.updatePerformanceModel(feedbacks[i], update);
          }
        }
      }

      // Calculate success rate
      metrics.successRate =
        executionRecords.length > 0
          ? executionRecords.filter((r) => r.success).length /
            executionRecords.length
          : 0;

      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;

      this.cycleMetrics.push(metrics);
      console.log(`[v0] Cycle ${cycleId} completed:`, {
        duration: metrics.duration,
        successRate: metrics.successRate,
        learningUpdates: metrics.learningUpdates,
      });

      // Emit callback
      this.emitCycleComplete(metrics);

      return metrics;
    } catch (error) {
      console.error('[v0] Cycle execution failed:', error);
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      return metrics;
    }
  }

  /**
   * Continuous execution loop
   */
  private async continuousExecutionCycle(): Promise<void> {
    const taskQueue = ['Initialize project', 'Run tests', 'Build application'];
    let taskIndex = 0;

    while (this.isRunning) {
      try {
        const task = taskQueue[taskIndex % taskQueue.length];
        await this.executeCycle(task);

        taskIndex++;

        // Wait before next cycle
        await this.delay(5000);
      } catch (error) {
        console.error('[v0] Cycle error:', error);
        await this.delay(2000);
      }
    }
  }

  /**
   * Get system state snapshot
   */
  getSystemState(): {
    isRunning: boolean;
    cyclesCompleted: number;
    totalExecutions: number;
    averageSuccessRate: number;
    filesystemState: Record<string, any>;
    terminalMetrics: any;
    editorState: any;
  } {
    const completedCycles = this.cycleMetrics.filter((m) => m.endTime);
    const avgSuccess =
      completedCycles.length > 0
        ? completedCycles.reduce((sum, m) => sum + m.successRate, 0) /
          completedCycles.length
        : 0;

    return {
      isRunning: this.isRunning,
      cyclesCompleted: completedCycles.length,
      totalExecutions: completedCycles.reduce((sum, m) => sum + m.executionRecords, 0),
      averageSuccessRate: avgSuccess,
      filesystemState: this.filesystemMonitor.getSnapshot(process.cwd()),
      terminalMetrics: this.terminalExecutor.getMetrics(),
      editorState: this.vscodeAdapter.getEditorState(),
    };
  }

  /**
   * Get learning summary
   */
  getLearningProgress(): {
    totalLearned: number;
    successPatterns: number;
    failurePatterns: number;
    modelImprovements: Record<string, number>;
  } {
    const summary = this.learningEngine.generateLearningSummary();
    return {
      totalLearned: summary.totalLearning,
      successPatterns: summary.successPatterns.length,
      failurePatterns: summary.failurePatterns.length,
      modelImprovements: Object.fromEntries(summary.modelImprovements),
    };
  }

  /**
   * Execute a specific command via terminal
   */
  async executeTerminalCommand(
    command: string,
    onOutput?: (output: string) => void
  ): Promise<any> {
    return this.terminalExecutor.executeCommand(command, process.cwd(), onOutput);
  }

  /**
   * Get execution cycle history
   */
  getCycleHistory(limit: number = 10): ExecutionCycleMetrics[] {
    return this.cycleMetrics.slice(-limit);
  }

  /**
   * Register cycle completion callback
   */
  onCycleComplete(callback: (cycle: ExecutionCycleMetrics) => void): void {
    this.cycleCallbacks.push(callback);
  }

  /**
   * Private helper methods
   */
  private emitCycleComplete(metrics: ExecutionCycleMetrics): void {
    this.cycleCallbacks.forEach((cb) => {
      try {
        cb(metrics);
      } catch (error) {
        console.error('[v0] Callback error:', error);
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Export agent state for persistence
   */
  exportState(): {
    cycleHistory: ExecutionCycleMetrics[];
    learningProgress: any;
    systemState: any;
  } {
    return {
      cycleHistory: this.cycleMetrics,
      learningProgress: this.getLearningProgress(),
      systemState: this.getSystemState(),
    };
  }
}
