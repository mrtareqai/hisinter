import UnifiedIDEBrain from './unifiedIDEBrain';
import UnifiedExecutionPipeline from './unifiedExecutionPipeline';
import IntelligentQuestioningSystem from './intelligentQuestioningSystem';
import ProjectGenerationEngine from './projectGenerationEngine';
import UnifiedConsoleInterface from './unifiedConsoleInterface';
import ProjectWorldModel from '../autonomy/projectWorldModel';

/**
 * UnifiedAgentRouter - Factory and singleton for unified IDE agent
 * Provides single entry point to all unified systems
 */
export class UnifiedAgentRouter {
  private static instance: UnifiedAgentRouter | null = null;

  private brain: UnifiedIDEBrain;
  private pipeline: UnifiedExecutionPipeline;
  private questioningSystem: IntelligentQuestioningSystem;
  private projectGenerator: ProjectGenerationEngine;
  private console: UnifiedConsoleInterface;
  private worldModel: ProjectWorldModel;

  private projectRoot: string;

  private constructor(projectRoot: string) {
    this.projectRoot = projectRoot;

    // Initialize systems in order
    console.log('[v0] Initializing UnifiedAgentRouter...');

    // Core world model
    this.worldModel = new ProjectWorldModel(projectRoot);
    this.worldModel.scanProjectStructure();
    this.worldModel.startPeriodicSync();

    // Brain (orchestrator)
    this.brain = new UnifiedIDEBrain(projectRoot);

    // Questioning system
    this.questioningSystem = new IntelligentQuestioningSystem(this.worldModel);

    // Project generator
    this.projectGenerator = new ProjectGenerationEngine(projectRoot);

    // Pipeline
    this.pipeline = new UnifiedExecutionPipeline(
      this.brain,
      this.questioningSystem,
      this.projectGenerator
    );

    // Console interface
    this.console = new UnifiedConsoleInterface(
      this.brain,
      this.pipeline,
      this.questioningSystem
    );

    console.log('[v0] UnifiedAgentRouter initialized successfully');
  }

  /**
   * Get singleton instance
   */
  static getInstance(projectRoot: string): UnifiedAgentRouter {
    if (!UnifiedAgentRouter.instance) {
      UnifiedAgentRouter.instance = new UnifiedAgentRouter(projectRoot);
    }
    return UnifiedAgentRouter.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    UnifiedAgentRouter.instance = null;
  }

  /**
   * Get the unified console interface
   */
  getConsole(): UnifiedConsoleInterface {
    return this.console;
  }

  /**
   * Get the brain
   */
  getBrain(): UnifiedIDEBrain {
    return this.brain;
  }

  /**
   * Get the pipeline
   */
  getPipeline(): UnifiedExecutionPipeline {
    return this.pipeline;
  }

  /**
   * Get the questioning system
   */
  getQuestioningSystem(): IntelligentQuestioningSystem {
    return this.questioningSystem;
  }

  /**
   * Get the project generator
   */
  getProjectGenerator(): ProjectGenerationEngine {
    return this.projectGenerator;
  }

  /**
   * Get the world model
   */
  getWorldModel(): ProjectWorldModel {
    return this.worldModel;
  }

  /**
   * Process user input through unified console
   */
  async processUserInput(input: string): Promise<void> {
    return this.console.processUserInput(input);
  }

  /**
   * Answer a question
   */
  async answerQuestion(questionContent: string, answer: string): Promise<void> {
    return this.console.answerQuestion(questionContent, answer);
  }

  /**
   * Get current state
   */
  getState() {
    return {
      console: this.console.getState(),
      brain: this.brain.getState(),
      worldModel: this.worldModel.getProjectIntelligence(),
    };
  }

  /**
   * Get analytics
   */
  getAnalytics() {
    return this.brain.getAnalytics();
  }

  /**
   * Set autonomy level (0.0 - 1.0)
   */
  setAutonomyLevel(level: number): void {
    this.brain.setAutonomyLevel(level);
    this.console.setAutonomyLevel(level);
  }

  /**
   * Get console history
   */
  getConsoleHistory() {
    return this.console.getHistory();
  }

  /**
   * Get console output as string
   */
  getConsoleOutput(): string {
    return this.console.toString();
  }

  /**
   * Get all active contexts
   */
  getActiveContexts() {
    return this.pipeline.getActiveContexts();
  }

  /**
   * Subscribe to console messages
   */
  onConsoleMessage(callback: (msg: any) => void) {
    return this.console.onMessage(callback);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: any) => void) {
    return this.console.onStateChange(callback);
  }

  /**
   * Shutdown all systems
   */
  async shutdown(): Promise<void> {
    console.log('[v0] Shutting down UnifiedAgentRouter...');
    await this.brain.shutdown();
    UnifiedAgentRouter.instance = null;
  }
}

export default UnifiedAgentRouter;
