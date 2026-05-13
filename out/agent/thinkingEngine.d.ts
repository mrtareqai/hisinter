export type TaskType = 'explore' | 'analyze' | 'plan' | 'implement' | 'fix' | 'refactor' | 'explain' | 'quick';
export interface ThinkingStep {
    phase: 'explore' | 'read' | 'analyze' | 'plan' | 'execute' | 'verify' | 'summarize';
    description: string;
    tools: string[];
    optional?: boolean;
}
export interface ThinkingStrategy {
    type: TaskType;
    steps: ThinkingStep[];
    maxDepth: number;
    gatherContext: boolean;
    multiTool: boolean;
    maxIterations: number;
}
export declare class ThinkingEngine {
    /** Classify a user message into a task type */
    classifyTask(message: string): TaskType;
    /** Build a thinking strategy for the given task */
    buildStrategy(taskType: TaskType): ThinkingStrategy;
    /** Determine if this task needs deep exploration first */
    needsExploration(taskType: TaskType): boolean;
    /** Determine if this is a quick single-tool task */
    isQuickTask(taskType: TaskType): boolean;
    /** Get the system prompt enhancement for this task type */
    getTaskPromptEnhancement(taskType: TaskType): string;
}
