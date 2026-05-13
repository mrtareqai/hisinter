/**
 * Core types for Sinter AI 5.0 intelligence systems
 * Used across execution, feedback, validation, and learning pipelines
 */

export interface IntelligenceOutput {
  recommendedTool: string;
  toolArguments: Record<string, unknown>;
  expectedOutcome: string;
  priority: number;
  reasoning: string;
}

export interface ExecutionPrediction {
  id: string;
  timestamp: number;
  confidence: number;
  toolName: string;
  expectedSuccessRate: number;
  estimatedDuration: number;
}

export interface SystemMetrics {
  memoryUsed: number;
  cpuLoad: number;
  diskIO: string;
}

export interface OutcomeAnalysis {
  expectedVsActual: string;
  surpriseFactor: number;
  learningPotential: number;
}

export interface EnvironmentState {
  projectStructure: string;
  fileSystemState: Record<string, string>;
  errorContext: Record<string, unknown>;
}

export interface FeedbackChain {
  previousExecutionId?: string;
  dependentExecutionId?: string;
  sequencePosition: number;
}

// Re-export from other files for convenience
export { IntelligenceOutput, ExecutionPrediction } from '../orchestrator/intelligenceOrchestrator';
