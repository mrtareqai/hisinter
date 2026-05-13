import { UserIntent, ExecutionPlan, ExecutionStep, ActionType, IntentType, Checkpoint, ValidationRule } from '../../types/agent';
import { v4 as uuidv4 } from 'uuid';

export class UnifiedPlanner {
  async createPlan(intent: UserIntent): Promise<ExecutionPlan> {
    const steps = this.generateExecutionSteps(intent);
    const checkpoints = this.createCheckpoints(steps);
    const dependencies = this.identifyDependencies(steps);

    const plan: ExecutionPlan = {
      id: uuidv4(),
      intent,
      steps,
      estimatedDuration: this.estimateDuration(steps),
      checkpoints,
      rollbackable: this.checkRollbackability(steps),
      dependencies,
    };

    return plan;
  }

  private generateExecutionSteps(intent: UserIntent): ExecutionStep[] {
    const steps: ExecutionStep[] = [];

    switch (intent.type) {
      case IntentType.CREATE_PROJECT:
        return this.planProjectCreation(intent);

      case IntentType.ADD_FEATURE:
        return this.planFeatureAddition(intent);

      case IntentType.FIX_BUG:
        return this.planBugFix(intent);

      case IntentType.REFACTOR:
        return this.planRefactoring(intent);

      default:
        return this.planCustomTask(intent);
    }
  }

  private planProjectCreation(intent: UserIntent): ExecutionStep[] {
    const framework = (intent.parameters.framework as string) || 'react';
    const projectName = (intent.parameters.projectName as string) || 'new-project';

    return [
      {
        id: uuidv4(),
        order: 1,
        action: ActionType.RUN_COMMAND,
        description: `Create ${framework} project structure`,
        narrative: `Creating ${framework} project "${projectName}"...`,
        target: projectName,
        parameters: { framework, projectName },
        expectedOutput: 'Project created successfully',
        errorHandling: [{ condition: 'command_failed', action: 'retry' as any, retries: 2, backoff: 1000 }],
        checkpoint: 'project_structure_created',
      },
      {
        id: uuidv4(),
        order: 2,
        action: ActionType.CREATE_FOLDER,
        description: 'Set up project directories',
        narrative: 'Setting up project directories...',
        target: projectName,
        parameters: { structure: ['src', 'public', 'tests'] },
        expectedOutput: 'Directories created',
        errorHandling: [],
        checkpoint: 'directories_created',
      },
      {
        id: uuidv4(),
        order: 3,
        action: ActionType.INSTALL_PACKAGE,
        description: 'Install dependencies',
        narrative: 'Installing dependencies. This may take a moment...',
        target: projectName,
        parameters: { packages: [] },
        expectedOutput: 'Dependencies installed',
        errorHandling: [{ condition: 'command_failed', action: 'retry' as any, retries: 3, backoff: 2000 }],
        checkpoint: 'dependencies_installed',
      },
      {
        id: uuidv4(),
        order: 4,
        action: ActionType.GENERATE_CODE,
        description: 'Generate initial components',
        narrative: 'Generating starter components...',
        target: 'src',
        parameters: { framework, components: ['App', 'Home'] },
        expectedOutput: 'Components generated',
        errorHandling: [],
        checkpoint: 'initial_components_generated',
      },
      {
        id: uuidv4(),
        order: 5,
        action: ActionType.UPDATE_CONFIG,
        description: 'Configure build and development settings',
        narrative: 'Configuring build and development tools...',
        target: projectName,
        parameters: { configs: ['vite', 'tsconfig', 'eslint'] },
        expectedOutput: 'Configuration complete',
        errorHandling: [],
      },
    ];
  }

  private planFeatureAddition(intent: UserIntent): ExecutionStep[] {
    const featureName = (intent.parameters.featureName as string) || 'NewFeature';

    return [
      {
        id: uuidv4(),
        order: 1,
        action: ActionType.ANALYZE_CODE,
        description: 'Analyze existing codebase',
        narrative: 'Analyzing the current codebase structure...',
        target: '.',
        parameters: { depth: 3 },
        expectedOutput: 'Analysis complete',
        errorHandling: [],
      },
      {
        id: uuidv4(),
        order: 2,
        action: ActionType.GENERATE_CODE,
        description: `Generate ${featureName} component`,
        narrative: `Creating ${featureName} component...`,
        target: 'src/components',
        parameters: { name: featureName, type: 'component' },
        expectedOutput: 'Component created',
        errorHandling: [],
      },
      {
        id: uuidv4(),
        order: 3,
        action: ActionType.MODIFY_FILE,
        description: 'Integrate component into application',
        narrative: `Integrating ${featureName} into your app...`,
        target: 'src/App.tsx',
        parameters: { componentName: featureName, action: 'import_and_use' },
        expectedOutput: 'Component integrated',
        errorHandling: [],
      },
      {
        id: uuidv4(),
        order: 4,
        action: ActionType.GENERATE_CODE,
        description: 'Generate tests for new feature',
        narrative: `Creating tests for ${featureName}...`,
        target: 'src/tests',
        parameters: { componentName: featureName },
        expectedOutput: 'Tests created',
        errorHandling: [],
      },
    ];
  }

  private planBugFix(intent: UserIntent): ExecutionStep[] {
    return [
      {
        id: uuidv4(),
        order: 1,
        action: ActionType.ANALYZE_CODE,
        description: 'Analyze error and locate source',
        narrative: 'Analyzing the error...',
        target: '.',
        parameters: { errorContext: intent.raw },
        expectedOutput: 'Error source identified',
        errorHandling: [],
      },
      {
        id: uuidv4(),
        order: 2,
        action: ActionType.MODIFY_FILE,
        description: 'Apply fix',
        narrative: 'Applying fix...',
        target: '.',
        parameters: { fix: true },
        expectedOutput: 'Fix applied',
        errorHandling: [],
      },
      {
        id: uuidv4(),
        order: 3,
        action: ActionType.RUN_COMMAND,
        description: 'Test the fix',
        narrative: 'Testing the fix...',
        target: '.',
        parameters: { command: 'test' },
        expectedOutput: 'Tests pass',
        errorHandling: [{ condition: 'command_failed', action: 'retry' as any, retries: 2, backoff: 1000 }],
      },
    ];
  }

  private planRefactoring(intent: UserIntent): ExecutionStep[] {
    return [
      {
        id: uuidv4(),
        order: 1,
        action: ActionType.ANALYZE_CODE,
        description: 'Identify refactoring opportunities',
        narrative: 'Analyzing code for improvement opportunities...',
        target: '.',
        parameters: { analysis: 'refactoring' },
        expectedOutput: 'Refactoring targets identified',
        errorHandling: [],
      },
      {
        id: uuidv4(),
        order: 2,
        action: ActionType.MODIFY_FILE,
        description: 'Apply refactoring changes',
        narrative: 'Refactoring code...',
        target: '.',
        parameters: { refactor: true },
        expectedOutput: 'Refactoring complete',
        errorHandling: [],
      },
      {
        id: uuidv4(),
        order: 3,
        action: ActionType.RUN_COMMAND,
        description: 'Verify refactoring with tests',
        narrative: 'Running tests to verify refactoring...',
        target: '.',
        parameters: { command: 'test' },
        expectedOutput: 'All tests pass',
        errorHandling: [],
      },
    ];
  }

  private planCustomTask(intent: UserIntent): ExecutionStep[] {
    return [
      {
        id: uuidv4(),
        order: 1,
        action: ActionType.ANALYZE_CODE,
        description: 'Understand the request',
        narrative: 'Understanding your request...',
        target: '.',
        parameters: { context: intent.raw },
        expectedOutput: 'Plan created',
        errorHandling: [],
      },
    ];
  }

  private createCheckpoints(steps: ExecutionStep[]): Checkpoint[] {
    return steps
      .filter((step) => step.checkpoint)
      .map((step, index) => ({
        id: uuidv4(),
        afterStep: step.order,
        validation: this.createValidationRules(step),
        recoveryStrategy: step.errorHandling[0],
      }));
  }

  private createValidationRules(step: ExecutionStep): ValidationRule[] {
    const rules: ValidationRule[] = [];

    if (step.action === ActionType.CREATE_FILE) {
      rules.push({
        type: 'file_exists',
        target: step.target,
        expected: '',
      });
    }

    if (step.action === ActionType.RUN_COMMAND) {
      rules.push({
        type: 'command_success',
        target: step.target,
        expected: step.expectedOutput,
      });
    }

    return rules;
  }

  private identifyDependencies(steps: ExecutionStep[]): string[] {
    const deps: Set<string> = new Set();

    for (let i = 1; i < steps.length; i++) {
      deps.add(steps[i - 1].id);
    }

    return Array.from(deps);
  }

  private estimateDuration(steps: ExecutionStep[]): number {
    // Simple estimation: 2 seconds per step on average
    return steps.length * 2000;
  }

  private checkRollbackability(steps: ExecutionStep[]): boolean {
    // Can rollback if no permanent changes made
    const permanentActions = [ActionType.DELETE_FILE];
    return !steps.some((step) => permanentActions.includes(step.action));
  }
}

export const globalUnifiedPlanner = new UnifiedPlanner();
