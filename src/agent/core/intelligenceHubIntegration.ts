import IntelligenceOrchestrator from '../../intelligence/orchestrator/intelligenceOrchestrator';
import { GoalDecompositionEngine } from '../../intelligence/autonomy/goalDecompositionEngine';
import { PrioritizationEngine } from '../../intelligence/autonomy/prioritizationEngine';
import { AutonomyController } from '../../intelligence/autonomy/autonomyController';
import { ConflictResolutionEngine } from '../../intelligence/autonomy/conflictResolutionEngine';
import { ProjectWorldModel } from '../../intelligence/autonomy/projectWorldModel';

/**
 * IntelligenceHubIntegration
 * Bridges all intelligence systems into unified communication layer
 * Manages inter-system dependencies and data flow
 */
export class IntelligenceHubIntegration {
  private orchestrator: IntelligenceOrchestrator;
  private goalDecomposition: GoalDecompositionEngine;
  private prioritization: PrioritizationEngine;
  private autonomyController: AutonomyController;
  private conflictResolver: ConflictResolutionEngine;
  private worldModel: ProjectWorldModel;
  private integrationId: string;

  constructor(
    orchestrator: IntelligenceOrchestrator,
    worldModel: ProjectWorldModel
  ) {
    this.orchestrator = orchestrator;
    this.worldModel = worldModel;
    this.integrationId = `hub-${Date.now()}`;

    // Initialize autonomy systems
    this.goalDecomposition = new GoalDecompositionEngine();
    this.prioritization = new PrioritizationEngine();
    this.autonomyController = new AutonomyController();
    this.conflictResolver = new ConflictResolutionEngine();
  }

  /**
   * Full intelligent pipeline: analyze → decompose → prioritize → decide
   */
  async fullIntelligencePipeline(
    userGoal: string
  ): Promise<{
    analysis: any;
    decomposition: any;
    priorities: any[];
    decision: any;
    nextAction: string;
  }> {
    // Step 1: Analyze goal using deep reasoning
    const analysis = await this.orchestrator.orchestrate(userGoal);

    // Step 2: Decompose into sub-goals
    const decomposition = this.goalDecomposition.decompose(userGoal);

    // Step 3: Prioritize execution order
    const priorities = this.prioritization.prioritize(
      Array.from(decomposition.allGoals.values()),
      decomposition.executionOrder
    );

    // Step 4: Make autonomy decision
    const decision = await this.autonomyController.decideExecution(
      `decision-${Date.now()}`,
      {
        taskDescription: userGoal,
        confidence: analysis.metadata.confidence,
        complexity: Math.min(1, decomposition.allGoals.size / 10),
        riskLevel:
          decomposition.allGoals.size > 5 ? 'high' : 'medium',
      }
    );

    // Determine next action
    let nextAction = 'ready_to_execute';
    if (decision.decision === 'ask') {
      nextAction = 'awaiting_clarification';
    } else if (decision.decision === 'block') {
      nextAction = 'blocked_by_safety';
    }

    return {
      analysis,
      decomposition,
      priorities,
      decision,
      nextAction,
    };
  }

  /**
   * Validate goal execution path
   */
  async validateExecutionPath(
    goalTree: any
  ): Promise<{
    valid: boolean;
    conflicts: any[];
    warnings: string[];
    optimizedOrder: string[];
  }> {
    const conflicts = await this.conflictResolver.detectConflicts(
      `validation-${Date.now()}`,
      goalTree.executionOrder.map((goalId: string) => ({
        goalId,
        type: 'execution',
      }))
    );

    const optimizedOrder = this.prioritization.optimizeExecutionOrder(
      goalTree.executionOrder,
      conflicts
    );

    const warnings: string[] = [];
    if (conflicts.length > 0) {
      warnings.push(`Detected ${conflicts.length} potential conflicts`);
    }
    if (optimizedOrder.length !== goalTree.executionOrder.length) {
      warnings.push('Execution order has been optimized');
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
      warnings,
      optimizedOrder,
    };
  }

  /**
   * Get intelligent suggestions for next action
   */
  async suggestNextActions(currentGoal: string): Promise<string[]> {
    const orchestration = await this.orchestrator.orchestrate(currentGoal);
    return orchestration.outputs.slice(0, 5).map((o: any) => o.expectedOutcome);
  }

  /**
   * Check if autonomous execution is safe for given goal
   */
  async isAutonomousSafe(goalDescription: string): Promise<{
    safe: boolean;
    confidence: number;
    risks: string[];
  }> {
    const decision = await this.autonomyController.decideExecution(
      `safety-check-${Date.now()}`,
      {
        taskDescription: goalDescription,
        confidence: 0.8,
        complexity: 0.5,
        riskLevel: 'medium',
      }
    );

    const risks: string[] = [];
    if (decision.decision === 'block') {
      risks.push('Safety validation failed');
    }
    if (decision.confidence < 0.7) {
      risks.push('Confidence below safe threshold');
    }

    return {
      safe: decision.decision === 'execute',
      confidence: decision.confidence,
      risks,
    };
  }

  /**
   * Learn from execution result
   */
  async learnFromExecution(
    goalId: string,
    result: {
      success: boolean;
      duration: number;
      toolsUsed: string[];
      feedback: any;
    }
  ): Promise<void> {
    // Update world model
    this.worldModel.recordExecution(goalId, result);

    // Update prioritization weights based on success
    if (result.success) {
      this.prioritization.updateLearning({
        goalId,
        factor: 'success',
        weight: 1.1, // Increase weight for successful patterns
      });
    } else {
      this.prioritization.updateLearning({
        goalId,
        factor: 'failure',
        weight: 0.8,
      });
    }

    // Update autonomy controller confidence
    this.autonomyController.updateConfidenceModel(
      goalId,
      result.success ? 0.1 : -0.15 // Adjust confidence based on outcome
    );
  }

  /**
   * Export full hub status
   */
  exportHubStatus(): {
    integrationId: string;
    systems: {
      orchestrator: any;
      goalDecomposition: any;
      prioritization: any;
      autonomyController: any;
      conflictResolver: any;
      worldModel: any;
    };
  } {
    return {
      integrationId: this.integrationId,
      systems: {
        orchestrator: this.orchestrator.getSystemStatus(),
        goalDecomposition: this.goalDecomposition.getStatus?.() || {},
        prioritization: this.prioritization.getStatus?.() || {},
        autonomyController: this.autonomyController.getStatus?.() || {},
        conflictResolver: this.conflictResolver.getStatus?.() || {},
        worldModel: this.worldModel.exportIntelligence(),
      },
    };
  }
}

export default IntelligenceHubIntegration;
