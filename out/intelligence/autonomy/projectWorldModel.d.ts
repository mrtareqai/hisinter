export interface ProjectPattern {
    name: string;
    description: string;
    locations: string[];
    frequency: number;
    relatedPatterns: string[];
    confidence: number;
}
export interface ProjectDependency {
    from: string;
    to: string;
    type: 'import' | 'file' | 'package' | 'api';
    strength: number;
}
export interface OperationHistory {
    timestamp: number;
    operation: string;
    success: boolean;
    duration: number;
    resourceUsed: number;
    outcome: string;
}
export interface AnomalyRecord {
    timestamp: number;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    context: Record<string, unknown>;
}
export interface ProjectWorldState {
    projectRoot: string;
    lastUpdated: number;
    fileStructure: Map<string, {
        type: 'file' | 'dir';
        size: number;
        modified: number;
    }>;
    patterns: Map<string, ProjectPattern>;
    dependencies: ProjectDependency[];
    operationHistory: OperationHistory[];
    anomalies: AnomalyRecord[];
    architecturePatterns: string[];
    codeConventions: Record<string, string>;
    performanceMetrics: Record<string, number>;
    failureModes: Map<string, {
        frequency: number;
        resolution: string;
    }>;
}
export default class ProjectWorldModel {
    private state;
    private persistPath;
    private updateInterval;
    constructor(projectRoot: string);
    /**
     * Load world model from persistent storage
     */
    private loadFromDisk;
    /**
     * Save world model to persistent storage
     */
    saveToDisk(): void;
    /**
     * Scan project structure and update file information
     */
    scanProjectStructure(): void;
    /**
     * Record a successful or failed operation
     */
    recordOperation(operation: string, success: boolean, duration: number, resourceUsed: number, outcome: string): void;
    /**
     * Detect and record anomalies in execution
     */
    recordAnomaly(type: string, description: string, severity: 'low' | 'medium' | 'high', context?: Record<string, unknown>): void;
    /**
     * Learn a new pattern in the codebase
     */
    learnPattern(name: string, description: string, locations: string[], relatedPatterns?: string[]): void;
    /**
     * Register a dependency relationship
     */
    registerDependency(from: string, to: string, type: 'import' | 'file' | 'package' | 'api', strength?: number): void;
    /**
     * Record a failure mode and its resolution
     */
    recordFailureMode(failureType: string, resolution: string): void;
    /**
     * Get similar past operations
     */
    getSimilarOperations(operation: string, limit?: number): OperationHistory[];
    /**
     * Predict operation outcome based on history
     */
    predictOperationOutcome(operation: string): {
        successProbability: number;
        avgDuration: number;
        avgResource: number;
    };
    /**
     * Get intelligence about a file or directory
     */
    getFileIntelligence(filePath: string): {
        exists: boolean;
        type?: 'file' | 'dir';
        size?: number;
        lastModified?: number;
        relatedPatterns: ProjectPattern[];
        dependencies: ProjectDependency[];
    };
    /**
     * Get overall project intelligence summary
     */
    getProjectIntelligence(): {
        fileCount: number;
        dirCount: number;
        patternCount: number;
        dependencyCount: number;
        anomalyCount: number;
        successRate: number;
        avgOperationDuration: number;
        lastScanTime: number;
    };
    /**
     * Export full state
     */
    getState(): ProjectWorldState;
    /**
     * Start periodic sync to disk
     */
    startPeriodicSync(intervalMs?: number): void;
    /**
     * Stop periodic sync
     */
    stopPeriodicSync(): void;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
