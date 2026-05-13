import { ExecutionPlan, ExecutionResult, ExecutionError } from '../../types/agent';
export declare class ExecutionEngine {
    private workspaceRoot;
    private results;
    private errors;
    constructor(workspaceRoot?: string);
    executePlan(plan: ExecutionPlan, onProgress?: (result: ExecutionResult) => void): Promise<ExecutionResult[]>;
    private executeStep;
    private createFile;
    private modifyFile;
    private deleteFile;
    private createFolder;
    private installPackage;
    private runCommand;
    private generateCode;
    private analyzeCode;
    private updateConfig;
    private attemptRecovery;
    private validateCheckpoint;
    private createError;
    private categorizeError;
    private suggestFix;
    private determineSeverity;
    private isRecoverable;
    private delay;
    getResults(): ExecutionResult[];
    getErrors(): ExecutionError[];
}
export declare const createExecutionEngine: (workspaceRoot?: string) => ExecutionEngine;
