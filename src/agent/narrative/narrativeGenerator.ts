import { ExecutionStep, NarrativeEvent, ActionType, ExecutionResult } from '../../types/agent';
import { v4 as uuidv4 } from 'uuid';

export class NarrativeGenerator {
  private narrativeTemplates: Map<ActionType, string[]> = new Map([
    [ActionType.CREATE_FILE, [
      'Creating {{target}}...',
      'Setting up {{target}}...',
      'Writing {{target}}...',
    ]],
    [ActionType.MODIFY_FILE, [
      'Updating {{target}}...',
      'Modifying {{target}}...',
      'Refining {{target}}...',
    ]],
    [ActionType.DELETE_FILE, [
      'Cleaning up {{target}}...',
      'Removing {{target}}...',
    ]],
    [ActionType.CREATE_FOLDER, [
      'Creating folder structure...',
      'Setting up directories...',
      'Organizing project folders...',
    ]],
    [ActionType.INSTALL_PACKAGE, [
      'Installing dependencies...',
      'Setting up packages...',
      'This may take a moment...',
    ]],
    [ActionType.RUN_COMMAND, [
      'Running {{target}}...',
      'Executing setup...',
      'Building project...',
    ]],
    [ActionType.GENERATE_CODE, [
      'Generating {{target}}...',
      'Creating {{target}}...',
      'Writing {{target}}...',
    ]],
    [ActionType.ANALYZE_CODE, [
      'Analyzing {{target}}...',
      'Understanding {{target}}...',
      'Examining {{target}}...',
    ]],
    [ActionType.UPDATE_CONFIG, [
      'Configuring {{target}}...',
      'Setting up {{target}} configuration...',
      'Applying settings...',
    ]],
  ]);

  generateNarrativeEvent(step: ExecutionStep, stepNumber: number, totalSteps: number): NarrativeEvent {
    const narrative = this.generateNarrative(step);
    const progress = Math.round((stepNumber / totalSteps) * 100);

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'progress',
      message: narrative,
      step: step.id,
      progress,
    };
  }

  generateCompleteNarrative(steps: ExecutionStep[]): string {
    const narratives = steps.map((step) => step.narrative || this.generateNarrative(step));
    return narratives.join('\n');
  }

  generateSuccessNarrative(stepCount: number, duration: number): string {
    const messages = [
      `All done! I've completed ${stepCount} steps in ${this.formatDuration(duration)}.`,
      `Perfect! Finished in ${this.formatDuration(duration)}.`,
      `Success! Everything is set up and ready to go.`,
      `All ${stepCount} steps completed successfully!`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  generateErrorNarrative(step: ExecutionStep, error: string): string {
    const context = `while ${step.description}`;
    return `I encountered an issue ${context}: ${error}. Let me fix that...`;
  }

  generateRecoveryNarrative(attempt: number): string {
    if (attempt === 1) return 'Let me try again...';
    if (attempt === 2) return 'Trying a different approach...';
    return 'One more attempt...';
  }

  generateProgressSummary(completedSteps: number, totalSteps: number, currentStep: string): string {
    const percentage = Math.round((completedSteps / totalSteps) * 100);
    return `${percentage}% complete - ${currentStep}`;
  }

  generateRecommendation(context: string): string {
    const recommendations: Record<string, string[]> = {
      project_created: [
        'Your project is ready! Would you like me to add authentication?',
        'Project created! I can add a database connection if you\'d like.',
        'All set! Need me to set up testing?',
      ],
      feature_added: [
        'Feature added! Want me to create tests for it?',
        'Done! Shall I add styling to match your project?',
        'Complete! Ready to move on to the next feature?',
      ],
      bug_fixed: [
        'Bug fixed! Everything should work smoothly now.',
        'All fixed! The issue is resolved.',
        'Issue cleared! You\'re good to go.',
      ],
    };

    const messages = recommendations[context] || ['All done!'];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private generateNarrative(step: ExecutionStep): string {
    if (step.narrative) {
      return step.narrative;
    }

    const templates = this.narrativeTemplates.get(step.action);
    if (!templates || templates.length === 0) {
      return `${step.description}...`;
    }

    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace('{{target}}', step.target);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

export const globalNarrativeGenerator = new NarrativeGenerator();
