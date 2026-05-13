import IntelligenceOrchestrator from '../orchestrator/intelligenceOrchestrator';
import AutonomousRuntimeAgent from '../runtime/autonomousRuntimeAgent';
import AutonomyController from '../autonomy/autonomyController';
import GoalDecompositionEngine from '../autonomy/goalDecompositionEngine';
import ProjectWorldModel from '../autonomy/projectWorldModel';
import LearningEngine from '../runtime/learningEngine';
import AnalyticsEngine from '../runtime/analyticsEngine';

export interface ExecutionRequest {
  id: string;
  type: 'goal' | 'task' | 'question' | 'command';
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

export interface ExecutionDecision {
  id: string;
  action: 'execute' | 'ask_user' | 'decompose' | 'block' | 'defer';
  confidence: number;
  reasoning: string;
  requiredInfo?: string[];
  autonomyScore: number;
}

export interface BrainState {
  currentGoal: string | null;
  executingTasks: string[];
  queuedTasks: string[];
  systemHealth: number;
  autonomyLevel: number;
  lastUpdate: number;
}

/**
 * UnifiedIDEBrain - Central orchestration hub for Sinter AI 5.0
 * Integrates all 16 intelligence systems + autonomy layer
 * Routes execution through intelligent decision pipeline
 */
export class UnifiedIDEBrain {
  private orchestrator: IntelligenceOrchestrator;
  private runtimeAgent: AutonomousRuntimeAgent;
  private autonomyController: AutonomyController;
  private goalDecomposition: GoalDecompositionEngine;
  private worldModel: ProjectWorldModel;
  private learningEngine: LearningEngine;
  private analyticsEngine: AnalyticsEngine;

  private state: BrainState = {
    currentGoal: null,
    executingTasks: [],
    queuedTasks: [],
    systemHealth: 1.0,
    autonomyLevel: 0.85,
    lastUpdate: Date.now(),
  };

  private executionQueue: ExecutionRequest[] = [];
  private decisionHistory: ExecutionDecision[] = [];

  constructor(projectRoot: string) {
    // Initialize all core systems
    this.orchestrator = new IntelligenceOrchestrator({
      projectRoot,
      environment: 'production',
    });

    this.runtimeAgent = new AutonomousRuntimeAgent(projectRoot);
    this.autonomyController = new AutonomyController();
    this.goalDecomposition = new GoalDecompositionEngine();
    this.worldModel = new ProjectWorldModel(projectRoot);
    this.learningEngine = new LearningEngine();
    this.analyticsEngine = new AnalyticsEngine(projectRoot);

    this.initialize();
  }

  private initialize(): void {
    console.log('[v0] UnifiedIDEBrain initializing...');
    this.worldModel.scanProjectStructure();
    this.worldModel.startPeriodicSync();
  }

  /**
   * Process user goal through unified pipeline
   * Routes through decomposition, prioritization, autonomy check, execution
   */
  async processGoal(goal: string): Promise<{
    decision: ExecutionDecision;
    result?: unknown;
    questionsForUser?: string[];
  }> {
    const requestId = `goal-${Date.now()}`;

    console.log('[v0] Processing goal:', goal);

    // Step 1: Decompose goal
    const goalTree = this.goalDecomposition.decompose(goal);

    // Step 2: Get orchestrator intelligence
    const orchestration = await this.orchestrator.orchestrateWithAutonomy(goal);

    // Step 3: Get world model context
    const worldContext = this.worldModel.getProjectIntelligence();

    // Step 4: Run autonomy controller
    const decision = await this.autonomyController.decide(
      requestId,
      {
        type: 'goal',
        goal,
        decompositionDepth: orchestration.metadata.decompositionDepth,
        executionOrder: orchestration.executionOrder,
        estimatedEffort: orchestration.metadata.totalEstimatedEffort,
        confidence: orchestration.metadata.confidence,
        riskLevel: worldContext.riskPatterns.length > 0 ? 'high' : 'low',
        requiresUserConfirmation: goal.includes('delete') || goal.includes('deploy'),
      },
      {
        autonomyThreshold: this.state.autonomyLevel,
        confirmationThreshold: 0.7,
        blockThreshold: 0.3,
      }
    );

    console.log('[v0] Decision:', decision.decision, 'Confidence:', decision.confidence);

    // Step 5: Execute based on decision
    let result = undefined;
    let questionsForUser: string[] = [];

    if (decision.decision === 'execute') {
      result = await this.runtimeAgent.executeAutonomously(
        goal,
        orchestration.outputs,
        orchestration.predictions
      );

      // Learn from execution
      this.learningEngine.processExecutionFeedback({
        id: requestId,
        executionId: result.executionId,
        success: result.success,
        duration: result.duration,
        output: result.output,
        errors: result.errors,
        confidence: decision.confidence,
      });
    } else if (decision.decision === 'ask_user') {
      questionsForUser = decision.requiredInfo || [
        'Please clarify the scope of this task',
        'Should I proceed with this operation?',
      ];
    } else if (decision.decision === 'decompose') {
      // Decompose and queue sub-tasks
      for (const subGoal of Array.from(goalTree.allGoals.values()).slice(1)) {
        this.executionQueue.push({
          id: `subtask-${Date.now()}`,
          type: 'task',
          content: subGoal.description,
          priority: 'medium',
        });
      }
    } else if (decision.decision === 'block') {
      console.warn('[v0] Execution blocked for safety reasons');
    }

    // Store decision
    this.decisionHistory.push(decision);
    this.state.lastUpdate = Date.now();

    return {
      decision,
      result,
      questionsForUser,
    };
  }

  /**
   * Answer user question and continue execution
   */
  async answerQuestion(
    requestId: string,
    answer: string
  ): Promise<{
    decision: ExecutionDecision;
    result?: unknown;
  }> {
    // Find original decision
    const originalDecision = this.decisionHistory.find(
      (d) => d.id === requestId
    );
    if (!originalDecision) {
      throw new Error(`Decision ${requestId} not found`);
    }

    console.log('[v0] User answered:', answer);

    // Re-evaluate with user input
    const newDecision = await this.autonomyController.decide(
      requestId,
      {
        type: 'task',
        goal: originalDecision.reasoning,
        confidence: Math.min(1, originalDecision.confidence + 0.15),
        userInput: answer,
      },
      { autonomyThreshold: this.state.autonomyLevel }
    );

    let result = undefined;
    if (newDecision.decision === 'execute') {
      result = await this.runtimeAgent.executeAutonomously(answer, [], []);
    }

    return { decision: newDecision, result };
  }

  /**
   * Queue a task for execution
   */
  queueTask(task: ExecutionRequest): void {
    this.executionQueue.push(task);
    console.log('[v0] Task queued:', task.id);
  }

  /**
   * Process next task in queue
   */
  async processNextTask(): Promise<ExecutionDecision | null> {
    if (this.executionQueue.length === 0) {
      return null;
    }

    const task = this.executionQueue.shift();
    if (!task) return null;

    const result = await this.processGoal(task.content);
    return result.decision;
  }

  /**
   * Get current brain state
   */
  getState(): BrainState {
    return {
      ...this.state,
      executingTasks: this.runtimeAgent.getExecutingTaskIds(),
      queuedTasks: this.executionQueue.map((t) => t.id),
      systemHealth: this.orchestrator.getSystemStatus().readiness,
    };
  }

  /**
   * Adjust autonomy level
   */
  setAutonomyLevel(level: number): void {
    this.state.autonomyLevel = Math.max(0.1, Math.min(1, level));
    console.log('[v0] Autonomy level set to:', this.state.autonomyLevel);
  }

  /**
   * Get analytics and insights
   */
  getAnalytics() {
    return this.analyticsEngine.getComprehensiveReport();
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[v0] UnifiedIDEBrain shutting down...');
    await this.worldModel.persistState();
    await this.learningEngine.persistModels();
    console.log('[v0] Shutdown complete');
  }
}

export default UnifiedIDEBrain;
