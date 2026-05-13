/**
 * Sinter AI 5.0 Runtime Module
 * Complete execution-feedback-learning pipeline for autonomous agent
 */
export { ExecutionAdapter, ExecutionContext, ExecutionRecord } from './executionAdapter';
export { FeedbackCollector, ExecutionFeedback } from './feedbackCollector';
export { ValidationOrchestrator, ValidationRule, ValidationResult } from './validationOrchestrator';
export { LearningEngine, LearningUpdate } from './learningEngine';
export { FilesystemMonitor, TerminalExecutor, VSCodeAPIAdapter, } from './environmentAdapters';
export { AutonomousRuntimeAgent, ExecutionCycleMetrics } from './autonomousRuntimeAgent';
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
export declare function initializeRuntimeSystem(toolRegistry: ToolRegistry, intelligenceOrchestrator: IntelligenceOrchestrator, workspacePath?: string): AutonomousRuntimeAgent;
/**
 * Export factory for creating individual runtime components
 */
export declare const RuntimeFactory: {
    createExecutionAdapter: (toolRegistry: ToolRegistry) => ExecutionAdapter;
    createFeedbackCollector: (path?: string) => FeedbackCollector;
    createValidationOrchestrator: () => ValidationOrchestrator;
    createLearningEngine: (path?: string) => LearningEngine;
    createFilesystemMonitor: () => FilesystemMonitor;
    createTerminalExecutor: () => TerminalExecutor;
    createVSCodeAdapter: () => VSCodeAPIAdapter;
    createAutonomousAgent: (toolRegistry: ToolRegistry, orchestrator: IntelligenceOrchestrator, workspacePath?: string) => AutonomousRuntimeAgent;
};
