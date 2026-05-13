import { MemoryEntry, MemoryType, ExecutionResult } from '../types/agent';
export declare class SilentMemoryCore {
    private memories;
    private memoryFilePath;
    private maxMemories;
    private autoSaveInterval;
    constructor(storageDir?: string);
    learn(type: MemoryType, content: string, metadata?: Record<string, unknown>): void;
    learnFromExecution(result: ExecutionResult, type: MemoryType): void;
    recall(type: MemoryType, query?: string, limit?: number): MemoryEntry[];
    recallSimilar(content: string, limit?: number): MemoryEntry[];
    recallSuccessful(type: MemoryType): MemoryEntry[];
    markAsSuccessful(entryId: string): void;
    markAsUseful(entryId: string): void;
    learnUserPreference(preferenceKey: string, value: unknown): void;
    getUserPreference(preferenceKey: string): unknown | null;
    learnCodePattern(language: string, pattern: string, context: string): void;
    learnSolution(problem: string, solution: string, framework?: string): void;
    learnErrorFix(errorType: string, fix: string, context: string): void;
    private calculateInitialRelevance;
    private updateRelevance;
    private matchesQuery;
    private calculateSimilarity;
    private categorizePattern;
    private pruneIfNeeded;
    private loadMemories;
    private ensureStorageDir;
    private startAutoSave;
    save(): void;
    getMemoryStats(): MemoryStats;
    private groupByType;
    clear(): void;
    destroy(): void;
}
export interface MemoryStats {
    totalMemories: number;
    memoriesByType: Record<MemoryType, number>;
    topMemories: Array<{
        id: string;
        type: MemoryType;
        relevance: number;
    }>;
    averageRelevance: number;
}
export declare const createSilentMemoryCore: (storageDir?: string) => SilentMemoryCore;
