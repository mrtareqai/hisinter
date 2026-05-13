export { default as ProjectWorldModel } from './projectWorldModel';
export type {
  ProjectPattern,
  ProjectDependency,
  OperationHistory,
  AnomalyRecord,
  ProjectWorldState,
} from './projectWorldModel';

export { default as GoalDecompositionEngine } from './goalDecompositionEngine';
export type { Goal, GoalTree } from './goalDecompositionEngine';

export { default as PrioritizationEngine } from './prioritizationEngine';
export type { Priority, PrioritizationHistory } from './prioritizationEngine';

export { default as ConflictResolutionEngine } from './conflictResolutionEngine';
export type {
  Conflict,
  ConflictType,
  ResolutionStrategy,
} from './conflictResolutionEngine';

export { default as AutonomyController } from './autonomyController';
export type {
  ExecutionThresholds,
  ExecutionDecision,
  ExecutionRequest,
  ExecutionOutcome,
} from './autonomyController';

/**
 * Factory function to initialize all autonomy systems
 */
export function initializeAutonomySystems(projectRoot: string) {
  const worldModel = new ProjectWorldModel(projectRoot);
  const goalDecomposition = new GoalDecompositionEngine();
  const prioritization = new PrioritizationEngine();
  const conflictResolution = new ConflictResolutionEngine();
  const autonomyController = new AutonomyController();

  return {
    worldModel,
    goalDecomposition,
    prioritization,
    conflictResolution,
    autonomyController,
  };
}
