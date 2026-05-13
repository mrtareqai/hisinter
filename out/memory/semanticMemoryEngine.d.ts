/**
 * Semantic Memory Engine - Persistent learning system for Sinter AI
 *
 * Sinter learns from every execution:
 * - Remembers past tasks and their solutions
 * - Builds project-specific understanding
 * - Learns code style and preferences
 * - Suggests better approaches based on experience
 * - Improves over time with each use
 */
/**
 * Code pattern that was learned from execution
 */
export interface CodePattern {
    id: string;
    name: string;
    description: string;
    fileType: string;
    pattern: string;
    frequency: number;
    lastSeen: number;
    reliability: number;
}
/**
 * Task memory entry
 */
export interface TaskMemory {
    id: string;
    description: string;
    timestamp: number;
    duration: number;
    success: boolean;
    approach: string;
    codeChanges: string[];
    lessons: string[];
    embedding?: number[];
    projectContext: string;
    relevanceScore?: number;
}
/**
 * Project-specific memory
 */
export interface ProjectMemory {
    projectId: string;
    projectName: string;
    codeStyleProfile: {
        indentation: number;
        useSemicolons: boolean;
        lineLength: number;
        preferredPatterns: string[];
    };
    preferences: Map<string, any>;
    patterns: CodePattern[];
    pastTasks: TaskMemory[];
    lastUpdated: number;
}
/**
 * Memory retrieval suggestion
 */
export interface MemorySuggestion {
    taskId: string;
    description: string;
    similarity: number;
    approach: string;
    lessons: string[];
    duration: number;
    reliability: number;
}
export declare class SemanticMemoryEngine {
    private projectMemory;
    private allTasks;
    private globalPatterns;
    private memoryFile;
    private updateInterval;
    constructor(workspaceRoot?: string);
    /**
     * Remember a completed task
     */
    rememberTask(task: {
        id: string;
        description: string;
        projectId: string;
        duration: number;
        success: boolean;
        approach: string;
        codeChanges: string[];
        lessons: string[];
    }): void;
    /**
     * Remember a code pattern discovered during execution
     */
    rememberPattern(pattern: {
        name: string;
        description: string;
        fileType: string;
        pattern: string;
        reliability: number;
    }): CodePattern;
    /**
     * Remember a user preference
     */
    rememberPreference(projectId: string, key: string, value: any): void;
    /**
     * Retrieve similar tasks for current problem
     */
    retrieveSimilarTasks(query: string, projectId: string, limit?: number): MemorySuggestion[];
    /**
     * Get suggested approach for a task
     */
    getSuggestedApproach(query: string, projectId: string): MemorySuggestion | undefined;
    /**
     * Get project memory
     */
    getProjectMemory(projectId: string): ProjectMemory | undefined;
    /**
     * Update project code style profile
     */
    updateCodeStyle(projectId: string, changes: Partial<ProjectMemory['codeStyleProfile']>): void;
    /**
     * Get learning statistics
     */
    getLearningStats(): {
        totalTasksLearned: number;
        projectsTracked: number;
        patternsLearned: number;
        averageTaskDuration: number;
        successRate: number;
    };
    /**
     * Clear all memory (destructive)
     */
    clearAllMemory(): void;
    /**
     * Export memory as JSON
     */
    exportMemory(): string;
    /**
     * Private: Save memory to disk
     */
    private saveMemory;
    /**
     * Private: Load memory from disk
     */
    private loadMemory;
    /**
     * Private: Ensure memory directory exists
     */
    private ensureMemoryDirectory;
    /**
     * Cleanup on dispose
     */
    dispose(): void;
}
export declare let globalSemanticMemory: SemanticMemoryEngine;
/**
 * Initialize global semantic memory engine
 */
export declare function initializeGlobalSemanticMemory(workspaceRoot?: string): SemanticMemoryEngine;
