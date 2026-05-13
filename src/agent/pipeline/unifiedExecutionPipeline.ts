import UnifiedIDEBrain from '../core/unifiedIDEBrain';
import IntelligenceHubIntegration from '../core/intelligenceHubIntegration';
import AgentNarrativeEngine from '../core/agentNarrativeEngine';

/**
 * UnifiedExecutionPipeline
 * Single execution flow: Intent → Analysis → Decomposition → Prioritization
 * → Conflict Resolution → Confidence Decision → Execute/Ask/Block → Feedback
 */
export class UnifiedExecutionPipeline {
  private brain: UnifiedIDEBrain;
  private hubIntegration: IntelligenceHubIntegration;
  private narrativeEngine: AgentNarrativeEngine;
  private pipelineId: string;
  private executionLog: Array<{
    timestamp: number;
    stage: string;
    data: any;
  }>;

  constructor(
    brain: UnifiedIDEBrain,
    hubIntegration: IntelligenceHubIntegration
  ) {
    this.brain = brain;
    this.hubIntegration = hubIntegration;
    this.narrativeEngine = new AgentNarrativeEngine();
    this.pipelineId = `pipeline-${Date.now()}`;
    this.executionLog = [];
  }

  /**
   * Execute full pipeline from user input to completion
   */
  async executePipeline(userInput: string): Promise<{
    success: boolean;
    results: any[];
    narrative: string[];
    executionTime: number;
  }> {
    const startTime = Date.now();
    const results: any[] = [];

    try {
      // Stage 1: Thinking
      this.logStage('thinking', { input: userInput });
      const thinkingNarrative =
        this.narrativeEngine.generateThinkingNarrative(userInput);
      this.narrativeEngine.recordNarrative('thinking', thinkingNarrative);

      // Stage 2: Intent processing through unified brain
      const brainDecision = await this.brain.processUserIntent(userInput);
      this.logStage('intent-processed', brainDecision);

      if (brainDecision.decision === 'block') {
        return {
          success: false,
          results: [],
          narrative: this.narrativeEngine.getRecentNarratives(),
          executionTime: Date.now() - startTime,
        };
      }

      // Stage 3: Full intelligence pipeline
      this.logStage('pipeline-start', {});
      const pipeline = await this.hubIntegration.fullIntelligencePipeline(
        userInput
      );
      this.logStage('pipeline-complete', pipeline);

      const decomposedNarrative =
        this.narrativeEngine.generateDecomposedNarrative(
          pipeline.decomposition.executionOrder,
          pipeline.priorities
        );
      this.narrativeEngine.recordNarrative('decomposed', decomposedNarrative);

      // Stage 4: Validation
      const validation = await this.hubIntegration.validateExecutionPath(
        pipeline.decomposition
      );
      this.logStage('validated', validation);

      if (!validation.valid && validation.conflicts.length > 0) {
        // Ask user for clarification
        const questionNarrative =
          this.narrativeEngine.generateQuestionNarrative(
            'Should I resolve these conflicts automatically or would you prefer to intervene?'
          );
        this.narrativeEngine.recordNarrative('questioning', questionNarrative);

        return {
          success: false,
          results: [],
          narrative: this.narrativeEngine.getRecentNarratives(),
          executionTime: Date.now() - startTime,
        };
      }

      // Stage 5: Execute each goal in priority order
      for (const goalId of validation.optimizedOrder) {
        const goal = pipeline.decomposition.allGoals.get(goalId);

        if (!goal) continue;

        const executionNarrative =
          this.narrativeEngine.generateExecutionNarrative(
            goal.title,
            goal.estimatedDuration || 5000
          );
        this.narrativeEngine.recordNarrative('executing', executionNarrative);

        const executionResult = await this.brain.executeGoal(
          goalId,
          goal.description
        );

        results.push({
          goalId,
          goal: goal.title,
          ...executionResult,
        });

        const successNarrative = executionResult.success
          ? this.narrativeEngine.generateSuccessNarrative(
              goal.title,
              executionResult.output
            )
          : this.narrativeEngine.generateErrorNarrative(
              executionResult.feedback?.error || 'Unknown error'
            );

        this.narrativeEngine.recordNarrative('executed', successNarrative);

        // Learn from execution
        await this.hubIntegration.learnFromExecution(goalId, {
          success: executionResult.success,
          duration: 0,
          toolsUsed: [],
          feedback: executionResult.feedback,
        });

        // Report progress
        const progressNarrative = this.narrativeEngine.generateProgressNarrative(
          results.length,
          validation.optimizedOrder.length,
          executionResult.success ? 'proceeding' : 'recovering'
        );
        this.narrativeEngine.recordNarrative('progress', progressNarrative);
      }

      // Stage 6: Completion
      const completionNarrative = this.narrativeEngine.generateCompletionNarrative(
        {
          goals_completed: results.filter((r) => r.success).length,
          goals_failed: results.filter((r) => !r.success).length,
          total_time: `${Date.now() - startTime}ms`,
        }
      );
      this.narrativeEngine.recordNarrative('completed', completionNarrative);

      return {
        success: results.some((r) => r.success),
        results,
        narrative: this.narrativeEngine.getNarrativeArc().map((n) => n.narrative),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorNarrative = this.narrativeEngine.generateErrorNarrative(
        String(error)
      );
      this.narrativeEngine.recordNarrative('error', errorNarrative);

      return {
        success: false,
        results,
        narrative: this.narrativeEngine.getRecentNarratives(),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute single goal with minimal oversight
   */
  async executeGoal(
    goalId: string,
    goalDescription: string
  ): Promise<{
    success: boolean;
    output: string;
    narrative: string;
  }> {
    const narrative = this.narrativeEngine.generateExecutionNarrative(
      goalDescription,
      5000
    );
    this.narrativeEngine.recordNarrative('goal-execution', narrative);

    const result = await this.brain.executeGoal(goalId, goalDescription);

    return {
      success: result.success,
      output: result.output,
      narrative,
    };
  }

  /**
   * Stream execution results in real-time
   */
  async *streamExecution(
    userInput: string
  ): AsyncGenerator<{
    stage: string;
    data: any;
    narrative: string;
  }> {
    const startTime = Date.now();

    // Yield thinking
    yield {
      stage: 'thinking',
      data: { input: userInput },
      narrative: this.narrativeEngine.generateThinkingNarrative(userInput),
    };

    // Process intent
    const brainDecision = await this.brain.processUserIntent(userInput);
    yield {
      stage: 'decision',
      data: brainDecision,
      narrative: `Decision: ${brainDecision.decision}`,
    };

    // Full pipeline
    const pipeline = await this.hubIntegration.fullIntelligencePipeline(
      userInput
    );

    yield {
      stage: 'decomposed',
      data: pipeline.decomposition,
      narrative: this.narrativeEngine.generateDecomposedNarrative(
        pipeline.decomposition.executionOrder,
        pipeline.priorities
      ),
    };

    // Execute each goal
    const validation = await this.hubIntegration.validateExecutionPath(
      pipeline.decomposition
    );

    for (const goalId of validation.optimizedOrder) {
      const goal = pipeline.decomposition.allGoals.get(goalId);
      if (!goal) continue;

      yield {
        stage: 'executing',
        data: { goalId, goal: goal.title },
        narrative: this.narrativeEngine.generateExecutionNarrative(
          goal.title,
          goal.estimatedDuration || 5000
        ),
      };

      const result = await this.brain.executeGoal(goalId, goal.description);

      yield {
        stage: 'executed',
        data: { goalId, success: result.success },
        narrative: result.success
          ? this.narrativeEngine.generateSuccessNarrative(
              goal.title,
              result.output
            )
          : this.narrativeEngine.generateErrorNarrative(
              result.feedback?.error || 'Unknown error'
            ),
      };

      await this.hubIntegration.learnFromExecution(goalId, {
        success: result.success,
        duration: 0,
        toolsUsed: [],
        feedback: result.feedback,
      });
    }

    yield {
      stage: 'complete',
      data: { executionTime: Date.now() - startTime },
      narrative: this.narrativeEngine.generateCompletionNarrative({
        elapsed: `${Date.now() - startTime}ms`,
      }),
    };
  }

  /**
   * Log pipeline stage
   */
  private logStage(stage: string, data: any): void {
    this.executionLog.push({
      timestamp: Date.now(),
      stage,
      data,
    });
  }

  /**
   * Get execution log
   */
  getExecutionLog(): Array<{ timestamp: number; stage: string; data: any }> {
    return this.executionLog;
  }

  /**
   * Clear log
   */
  clearLog(): void {
    this.executionLog = [];
  }
}

export default UnifiedExecutionPipeline;
