import { UserIntent, ExecutionPlan } from '../../types/agent';
export declare class UnifiedPlanner {
    createPlan(intent: UserIntent): Promise<ExecutionPlan>;
    private generateExecutionSteps;
    private planProjectCreation;
    private planFeatureAddition;
    private planBugFix;
    private planRefactoring;
    private planCustomTask;
    private createCheckpoints;
    private createValidationRules;
    private identifyDependencies;
    private estimateDuration;
    private checkRollbackability;
}
export declare const globalUnifiedPlanner: UnifiedPlanner;
