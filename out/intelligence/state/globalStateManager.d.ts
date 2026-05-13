export interface StateSnapshot {
    timestamp: number;
    projectStructure: Record<string, any>;
    dependencies: Record<string, string>;
    lastActions: Array<{
        action: string;
        timestamp: number;
        result: 'success' | 'failure' | 'pending';
    }>;
    buildStatus: 'success' | 'failure' | 'pending' | 'unknown';
    errors: Array<{
        timestamp: number;
        message: string;
        stack?: string;
        context?: Record<string, any>;
    }>;
    executionMetrics: {
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
        averageResponseTime: number;
    };
}
export declare class GlobalStateManager {
    private state;
    private stateHistory;
    private eventListeners;
    private persistencePath;
    constructor(projectRoot: string);
    private initializeState;
    private loadStateFromDisk;
    persistToDisk(): void;
    updateProjectStructure(structure: Record<string, any>): void;
    updateDependencies(deps: Record<string, string>): void;
    recordAction(action: string, result: 'success' | 'failure' | 'pending'): void;
    setBuildStatus(status: 'success' | 'failure' | 'pending' | 'unknown'): void;
    recordError(message: string, stack?: string, context?: Record<string, any>): void;
    updateExecutionMetrics(metrics: Partial<StateSnapshot['executionMetrics']>): void;
    getState(): StateSnapshot;
    getLastActions(count?: number): StateSnapshot['lastActions'];
    getRecentErrors(count?: number): StateSnapshot['errors'];
    rollback(stepsBack?: number): void;
    saveSnapshot(): void;
    on(event: string, listener: Function): void;
    off(event: string, listener: Function): void;
    private emit;
}
export default GlobalStateManager;
