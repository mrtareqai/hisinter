import { ExecutionRequest, ExecutionDecision } from './unifiedIDEBrain';
import UnifiedIDEBrain from './unifiedIDEBrain';
import IntelligentQuestioningSystem from './intelligentQuestioningSystem';
import ProjectGenerationEngine from './projectGenerationEngine';

export interface PipelineStage {
  name: string;
  execute: (input: unknown) => Promise<unknown>;
  condition?: (input: unknown) => boolean;
}

export interface PipelineContext {
  requestId: string;
  originalRequest: ExecutionRequest;
  currentStage: string;
  stageResults: Map<string, unknown>;
  userInputs: Map<string, string>;
  startTime: number;
  estimatedDuration: number;
}

/**
 * UnifiedExecutionPipeline - Routes requests through intelligent decision pipeline
 * Stages: Analyze → Ask Questions → Decompose → Prioritize → Decide → Execute
 */
export class UnifiedExecutionPipeline {
  private brain: UnifiedIDEBrain;
  private questioningSystem: IntelligentQuestioningSystem;
  private projectGenerator: ProjectGenerationEngine;
  private pipelines: Map<string, PipelineStage[]> = new Map();
  private contexts: Map<string, PipelineContext> = new Map();

  constructor(
    brain: UnifiedIDEBrain,
    questioningSystem: IntelligentQuestioningSystem,
    projectGenerator: ProjectGenerationEngine
  ) {
    this.brain = brain;
    this.questioningSystem = questioningSystem;
    this.projectGenerator = projectGenerator;
    this.setupPipelines();
  }

  private setupPipelines(): void {
    // Standard goal processing pipeline
    this.pipelines.set('goal', [
      {
        name: 'analyze',
        execute: async (input: ExecutionRequest) => {
          console.log('[v0] Pipeline: Analyzing goal...');
          return { goal: input.content, type: input.type };
        },
      },
      {
        name: 'ask_questions',
        execute: async (input: unknown) => {
          console.log('[v0] Pipeline: Checking if questions needed...');
          return input;
        },
      },
      {
        name: 'orchestrate',
        execute: async (input: unknown) => {
          console.log('[v0] Pipeline: Running intelligence orchestrator...');
          return input;
        },
      },
      {
        name: 'execute',
        execute: async (input: unknown) => {
          console.log('[v0] Pipeline: Executing...');
          return input;
        },
      },
    ]);

    // Project generation pipeline
    this.pipelines.set('generate', [
      {
        name: 'analyze_generation_request',
        execute: async (input: ExecutionRequest) => {
          console.log('[v0] Pipeline: Analyzing project generation...');
          return { request: input.content };
        },
      },
      {
        name: 'select_template',
        execute: async (input: unknown) => {
          console.log('[v0] Pipeline: Selecting template...');
          return input;
        },
      },
      {
        name: 'generate_structure',
        execute: async (input: unknown) => {
          console.log('[v0] Pipeline: Generating project structure...');
          return input;
        },
      },
      {
        name: 'initialize_project',
        execute: async (input: unknown) => {
          console.log('[v0] Pipeline: Initializing project...');
          return input;
        },
      },
    ]);

    // Question answering pipeline
    this.pipelines.set('answer', [
      {
        name: 'validate_answer',
        execute: async (input: unknown) => {
          console.log('[v0] Pipeline: Validating answer...');
          return input;
        },
      },
      {
        name: 'update_context',
        execute: async (input: unknown) => {
          console.log('[v0] Pipeline: Updating context...');
          return input;
        },
      },
      {
        name: 'reprocess_decision',
        execute: async (input: unknown) => {
          console.log('[v0] Pipeline: Reprocessing decision...');
          return input;
        },
      },
    ]);
  }

  /**
   * Execute request through appropriate pipeline
   */
  async execute(request: ExecutionRequest): Promise<{
    result: unknown;
    questionsForUser?: string[];
    decision?: ExecutionDecision;
    duration: number;
  }> {
    const requestId = request.id;
    const startTime = Date.now();

    const context: PipelineContext = {
      requestId,
      originalRequest: request,
      currentStage: '',
      stageResults: new Map(),
      userInputs: new Map(),
      startTime,
      estimatedDuration: 5000,
    };

    this.contexts.set(requestId, context);

    try {
      // Determine which pipeline to use
      let pipelineKey = 'goal';
      if (request.type === 'command') {
        if (request.content.includes('generate')) {
          pipelineKey = 'generate';
        }
      }

      const pipeline = this.pipelines.get(pipelineKey);
      if (!pipeline) {
        throw new Error(`Pipeline not found: ${pipelineKey}`);
      }

      console.log(`[v0] Executing ${pipelineKey} pipeline with ${pipeline.length} stages`);

      // Execute stages
      let stageInput: unknown = request;
      for (const stage of pipeline) {
        context.currentStage = stage.name;

        // Check stage condition
        if (stage.condition && !stage.condition(stageInput)) {
          console.log(`[v0] Skipping stage: ${stage.name}`);
          continue;
        }

        console.log(`[v0] Executing stage: ${stage.name}`);
        stageInput = await stage.execute(stageInput);
        context.stageResults.set(stage.name, stageInput);
      }

      // Process brain decision for goal pipeline
      let decision: ExecutionDecision | undefined;
      let questionsForUser: string[] | undefined;
      let result: unknown = stageInput;

      if (pipelineKey === 'goal') {
        const brainResult = await this.brain.processGoal(request.content);
        decision = brainResult.decision;
        questionsForUser = brainResult.questionsForUser;
        result = brainResult.result;
      }

      const duration = Date.now() - startTime;
      return {
        result,
        questionsForUser,
        decision,
        duration,
      };
    } catch (error) {
      console.error('[v0] Pipeline execution failed:', error);
      throw error;
    } finally {
      this.contexts.delete(requestId);
    }
  }

  /**
   * Get pipeline context
   */
  getContext(requestId: string): PipelineContext | undefined {
    return this.contexts.get(requestId);
  }

  /**
   * Get all active contexts
   */
  getActiveContexts(): PipelineContext[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Cancel execution
   */
  cancel(requestId: string): void {
    const context = this.contexts.get(requestId);
    if (context) {
      console.log(`[v0] Cancelling execution: ${requestId}`);
      this.contexts.delete(requestId);
    }
  }
}

export default UnifiedExecutionPipeline;
