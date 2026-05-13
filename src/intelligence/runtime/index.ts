/**
 * Sinter AI 5.0 Runtime Module
 * Complete execution-feedback-learning pipeline for autonomous agent
 */

export { ExecutionAdapter, ExecutionContext, ExecutionRecord } from './executionAdapter';
export { FeedbackCollector, ExecutionFeedback } from './feedbackCollector';
export { ValidationOrchestrator, ValidationRule, ValidationResult } from './validationOrchestrator';
export { LearningEngine, LearningUpdate } from './learningEngine';
export {
  FilesystemMonitor,
  TerminalExecutor,
  VSCodeAPIAdapter,
} from './environmentAdapters';
export { AutonomousRuntimeAgent, ExecutionCycleMetrics } from './autonomousRuntimeAgent';

// Main entry point for runtime integration
import { ExecutionAdapter } from './executionAdapter';
import { FeedbackCollector } from './feedbackCollector';
import { ValidationOrchestrator } from './validationOrchestrator';
import { LearningEngine } from './learningEngine';
import { FilesystemMonitor, TerminalExecutor, VSCodeAPIAdapter } from './environmentAdapters';
import { AutonomousRuntimeAgent } from './autonomousRuntimeAgent';
import { ToolRegistry } from '../../tools/toolRegistry';
import { IntelligenceOrchestrator } from '../orchestrator/intelligenceOrchestrator';

/**
 * Initialize complete Sinter AI 5.0 runtime system
 */
export function initializeRuntimeSystem(
  toolRegistry: ToolRegistry,
  intelligenceOrchestrator: IntelligenceOrchestrator,
  workspacePath: string = process.cwd()
): AutonomousRuntimeAgent {
  console.log('[v0] Initializing Sinter AI 5.0 Runtime System');

  const agent = new AutonomousRuntimeAgent(
    toolRegistry,
    intelligenceOrchestrator,
    workspacePath
  );

  console.log('[v0] Runtime system initialized and ready for autonomous execution');

  return agent;
}

/**
 * Export factory for creating individual runtime components
 */
export const RuntimeFactory = {
  createExecutionAdapter: (toolRegistry: ToolRegistry) =>
    new ExecutionAdapter(toolRegistry),

  createFeedbackCollector: (path?: string) =>
    new FeedbackCollector(path || './intelligence-feedback'),

  createValidationOrchestrator: () =>
    new ValidationOrchestrator(),

  createLearningEngine: (path?: string) =>
    new LearningEngine(path || './intelligence-learning'),

  createFilesystemMonitor: () =>
    new FilesystemMonitor(),

  createTerminalExecutor: () =>
    new TerminalExecutor(),

  createVSCodeAdapter: () =>
    new VSCodeAPIAdapter(),

  createAutonomousAgent: (
    toolRegistry: ToolRegistry,
    orchestrator: IntelligenceOrchestrator,
    workspacePath?: string
  ) =>
    new AutonomousRuntimeAgent(
      toolRegistry,
      orchestrator,
      workspacePath || process.cwd()
    ),
};
