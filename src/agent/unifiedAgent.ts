import * as vscode from 'vscode';
import { IntentEngine } from './intents/intentEngine';
import { UnifiedPlanner } from './planning/unifiedPlanner';
import { ExecutionEngine } from './execution/executionEngine';
import { ContextBrain } from './context/contextBrain';
import { ErrorIntelligence } from './recovery/errorIntelligence';
import { NarrativeGenerator } from './narrative/narrativeGenerator';
import { SilentMemoryCore } from '../memory/silentMemoryCore';
import { UserIntent, ExecutionPlan, ExecutionResult, AgentState, NarrativeEvent } from '../types/agent';

export class UnifiedAgent {
  private intentEngine: IntentEngine;
  private planner: UnifiedPlanner;
  private executionEngine: ExecutionEngine;
  private contextBrain: ContextBrain;
  private errorIntelligence: ErrorIntelligence;
  private narrativeGenerator: NarrativeGenerator;
  private memoryCore: SilentMemoryCore;

  private state: AgentState = {
    isActive: false,
    currentTask: null,
    currentStep: 0,
    progress: 0,
    narrativeEvents: [],
    errors: [],
    memoryState: {},
    contextState: null,
  };

  private eventListeners: Map<string, Function[]> = new Map();

  constructor(
    private context: vscode.ExtensionContext,
    private workspaceRoot: string = process.cwd()
  ) {
    this.intentEngine = new IntentEngine(context);
    this.planner = new UnifiedPlanner();
    this.executionEngine = new ExecutionEngine(workspaceRoot);
    this.contextBrain = new ContextBrain(workspaceRoot);
    this.errorIntelligence = new ErrorIntelligence();
    this.narrativeGenerator = new NarrativeGenerator();
    this.memoryCore = new SilentMemoryCore();
  }

  async handleUserRequest(userMessage: string): Promise<string> {
    // Step 1: Understand intent
    const intent = await this.intentEngine.analyzeIntent(userMessage);

    // Ask clarifying questions if needed
    if (intent.requiredInfo.length > 0) {
      return this.generateInitialResponse(intent);
    }

    // Step 2: Create execution plan (Hierarchical Decomposition)
    const plan = await this.planner.createPlan(intent);
    this.state.currentTask = plan;

    // Step 3: Analyze context (Deep Project Understanding)
    const context = await this.contextBrain.analyzeProject();
    this.state.contextState = context;

    // Step 4: Get relevant memories (Prior Knowledge)
    const relevantMemories = this.memoryCore.recallSimilar(userMessage, 3);
    const archDecisions = this.memoryCore.recall(MemoryType.PROJECT_PATTERN, undefined, 5)
      .filter(m => m.metadata.category === 'architectural_decision');

    // Step 5: Execute plan with Incremental Reasoning & Self-Correction
    this.state.isActive = true;

    // Track architectural decisions made during this session
    const sessionDecisions: string[] = [];

    const executionResults = await this.executionEngine.executePlan(plan, async (result) => {
      this.handleExecutionStep(result, plan);

      // Reflection Loop after each step
      if (result.success) {
        const step = plan.steps.find(s => s.id === result.stepId);
        if (step && step.description.includes('architectural')) {
          this.memoryCore.learnArchitecturalDecision(
            step.description,
            'Based on successful execution of plan step',
            [this.workspaceRoot]
          );
        }
      } else {
        // Self-correction logic
        const errorAnalysis = this.errorIntelligence.analyzeError(result.error!, result.stepId);
        if (errorAnalysis.canAutoRecover) {
          // Attempt recovery...
        }
      }
    });

    // Step 6: Handle any errors
    const errors = this.executionEngine.getErrors();
    for (const error of errors) {
      const step = plan.steps.find((s) => s.id === error.id);
      if (step) {
        const analysis = this.errorIntelligence.analyzeError(error, step);
        if (analysis.canAutoRecover) {
          const fix = this.errorIntelligence.suggestAutoFix(error);
          if (fix) {
            // Store the fix in memory
            this.memoryCore.learnErrorFix(error.type, fix, step.description);
          }
        }
      }
    }

    // Step 7: Learn from execution
    this.learnFromExecution(executionResults, intent);

    // Step 8: Generate success message
    const successMessage = this.generateSuccessMessage(intent, executionResults);

    this.state.isActive = false;
    return successMessage;
  }

  private generateInitialResponse(intent: UserIntent): string {
    const questions = intent.suggestedQuestions.slice(0, 2);
    const message = `I understand you want to ${intent.understood}.\n\n`;

    if (questions.length > 0) {
      return message + 'A couple of quick questions:\n' + questions.map((q) => `• ${q}`).join('\n');
    }

    return message + 'Let me get started...';
  }

  private handleExecutionStep(result: ExecutionResult, plan: ExecutionPlan): void {
    // Find the step
    const step = plan.steps.find((s) => s.id === result.stepId);
    if (!step) return;

    // Update progress
    this.state.currentStep = step.order;
    this.state.progress = (step.order / plan.steps.length) * 100;

    // Generate narrative
    const narrativeEvent = this.narrativeGenerator.generateNarrativeEvent(
      step,
      step.order,
      plan.steps.length
    );

    this.state.narrativeEvents.push(narrativeEvent);

    // Emit event for UI
    this.emit('step-complete', narrativeEvent);
  }

  private learnFromExecution(results: ExecutionResult[], intent: UserIntent): void {
    const allSuccess = results.every((r) => r.success);

    if (allSuccess) {
      // Learn the successful approach
      this.memoryCore.learnSolution(intent.raw, JSON.stringify(results), intent.context?.currentFramework);

      // Learn any patterns discovered
      if (this.state.contextState) {
        this.memoryCore.learn(
          'project_pattern' as any,
          JSON.stringify(this.state.contextState?.recentPatterns),
          { project: this.state.contextState?.name }
        );
      }
    }
  }

  private generateSuccessMessage(intent: UserIntent, results: ExecutionResult[]): string {
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    const narrative = this.narrativeGenerator.generateSuccessNarrative(results.length, totalTime);

    const recommendation = this.narrativeGenerator.generateRecommendation('project_created');

    return `${narrative}\n\n${recommendation}`;
  }

  async provideFollowUpQuestion(previousIntent: UserIntent): Promise<string | null> {
    const memories = this.memoryCore.recall('task_solution' as any, undefined, 3);

    if (memories.length > 0) {
      return 'Would you like me to apply a pattern I learned from a similar project?';
    }

    return null;
  }

  getAgentState(): AgentState {
    return { ...this.state };
  }

  getMemoryStats() {
    return this.memoryCore.getMemoryStats();
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const callbacks = this.eventListeners.get(event) || [];
    callbacks.forEach((cb) => cb(data));
  }

  async shutdown(): Promise<void> {
    this.memoryCore.destroy();
  }
}

export const createUnifiedAgent = (
  context: vscode.ExtensionContext,
  workspaceRoot?: string
): UnifiedAgent => {
  return new UnifiedAgent(context, workspaceRoot);
};
