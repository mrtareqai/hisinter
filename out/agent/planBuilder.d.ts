import { AnalysisResult } from './analysisPipeline';
import { ProjectMap } from './codebaseExplorer';
export interface Step {
    action: 'create' | 'modify' | 'delete' | 'run' | 'verify';
    target: string;
    description: string;
}
export interface Phase {
    number: number;
    name: string;
    description: string;
    steps: Step[];
    dependencies: number[];
    estimatedEffort: string;
}
export interface FileChange {
    path: string;
    action: 'new' | 'modify' | 'delete';
    summary: string;
}
export interface ExecutionPlan {
    title: string;
    summary: string;
    phases: Phase[];
    filesAffected: FileChange[];
    totalEstimatedTime: string;
    risks: string[];
}
export declare class PlanBuilder {
    /** Build a plan from analysis + user goal */
    buildPlan(analysis: AnalysisResult, userGoal: string, projectMap: ProjectMap): ExecutionPlan;
    /** Format plan as Markdown */
    formatAsMarkdown(plan: ExecutionPlan): string;
    private sumEffort;
    private parseEffortMinutes;
    private formatMinutes;
}
