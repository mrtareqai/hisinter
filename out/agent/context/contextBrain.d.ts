import { ProjectContext } from '../../types/agent';
export declare class ContextBrain {
    private projectRoot;
    private currentContext;
    constructor(projectRoot?: string);
    analyzeProject(): Promise<ProjectContext>;
    updateContext(updates: Partial<ProjectContext>): void;
    getContext(): ProjectContext | null;
    getSmartContext(intent: string, limit?: number): Promise<string>;
    private detectFramework;
    private detectPackageManager;
    private detectCodeStyle;
    private buildFileTree;
    private loadPackageJson;
    private extractPatterns;
}
export declare const createContextBrain: (projectRoot?: string) => ContextBrain;
