/**
 * Deep Workspace Graph - Real-time project understanding
 *
 * Builds a comprehensive graph of your project:
 * - File and folder structure
 * - Dependencies between files
 * - Imports and exports
 * - Architecture patterns
 * - Impact analysis for changes
 * - Smart context selection
 */
/**
 * Single node in the workspace graph
 */
export interface WorkspaceNode {
    id: string;
    path: string;
    type: 'file' | 'directory';
    language?: string;
    size: number;
    dependencies: Set<string>;
    dependents: Set<string>;
    imports: string[];
    exports: string[];
    lastModified: number;
    complexity?: 'low' | 'medium' | 'high';
}
/**
 * Architecture pattern detected in workspace
 */
export interface ArchitecturePattern {
    id: string;
    name: string;
    description: string;
    files: string[];
    confidence: number;
}
/**
 * Workspace dependency graph
 */
export interface WorkspaceGraph {
    root: string;
    nodes: Map<string, WorkspaceNode>;
    patterns: ArchitecturePattern[];
    timestamp: number;
    totalFiles: number;
    totalDirectories: number;
}
/**
 * Impact analysis result
 */
export interface ImpactAnalysis {
    changedFiles: string[];
    directlyAffected: string[];
    indirectlyAffected: string[];
    riskLevel: 'low' | 'medium' | 'high';
    estimatedScope: number;
}
/**
 * File context for smart selection
 */
export interface FileContext {
    path: string;
    relevanceScore: number;
    reason: string;
    distance: number;
}
export declare class WorkspaceGraph {
    private graph;
    private fileExtensionMap;
    private ignorePatterns;
    constructor(root: string);
    /**
     * Build graph from workspace
     */
    buildGraph(): Promise<WorkspaceGraph>;
    /**
     * Find all files that depend on a given file
     */
    findDependents(filePath: string): string[];
    /**
     * Find all files that a file depends on
     */
    findDependencies(filePath: string): string[];
    /**
     * Analyze impact of changes to specific files
     */
    analyzeImpact(changedFiles: string[]): ImpactAnalysis;
    /**
     * Get context for a specific file - related files and their relevance
     */
    getContextForFile(filePath: string): FileContext[];
    /**
     * Detect architecture patterns
     */
    detectPatterns(): void;
    /**
     * Get all detected patterns
     */
    getPatterns(): ArchitecturePattern[];
    /**
     * Get workspace statistics
     */
    getStatistics(): {
        totalFiles: number;
        totalDirectories: number;
        totalSize: number;
        filesByType: Record<string, number>;
        deepestPath: number;
        mostDependencies: {
            file: string;
            count: number;
        };
        highestComplexity: string[];
    };
    /**
     * Private: Recursively scan directory
     */
    private scanDirectory;
    /**
     * Private: Analyze dependencies between files
     */
    private analyzeDependencies;
    /**
     * Private: Find files matching a pattern
     */
    private findDirectoryPattern;
    /**
     * Private: Check if path should be ignored
     */
    private shouldIgnore;
    /**
     * Private: Get file language from extension
     */
    private getLanguage;
    /**
     * Private: Setup file extension map
     */
    private setupFileExtensionMap;
    /**
     * Cleanup on dispose
     */
    dispose(): void;
}
export declare let globalWorkspaceGraph: WorkspaceGraph;
/**
 * Initialize global workspace graph
 */
export declare function initializeGlobalWorkspaceGraph(root: string): Promise<WorkspaceGraph>;
