import * as fs from 'fs';
import * as path from 'path';
import { MemoryEntry, MemoryType, ExecutionResult } from '../types/agent';
import { v4 as uuidv4 } from 'uuid';

export class SilentMemoryCore {
  private memories: MemoryEntry[] = [];
  private memoryFilePath: string;
  private maxMemories: number = 1000;
  private autoSaveInterval: NodeJS.Timer | null = null;

  constructor(storageDir: string = path.join(process.cwd(), '.sinter')) {
    this.memoryFilePath = path.join(storageDir, 'memory.json');
    this.ensureStorageDir(storageDir);
    this.loadMemories();
    this.startAutoSave();
  }

  learn(type: MemoryType, content: string, metadata: Record<string, unknown> = {}): void {
    const entry: MemoryEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      content,
      metadata,
      relevance: this.calculateInitialRelevance(type),
      frequency: 1,
      success: metadata.success as boolean || true,
    };

    this.memories.push(entry);
    this.pruneIfNeeded();
  }

  learnFromExecution(result: ExecutionResult, type: MemoryType): void {
    this.learn(type, JSON.stringify(result), {
      success: result.success,
      duration: result.duration,
      stepId: result.stepId,
    });
  }

  recall(type: MemoryType, query?: string, limit: number = 5): MemoryEntry[] {
    let filtered = this.memories.filter((m) => m.type === type);

    if (query) {
      filtered = filtered.filter((m) => this.matchesQuery(m.content, query));
    }

    return filtered.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  recallSimilar(content: string, limit: number = 3): MemoryEntry[] {
    return this.memories
      .filter((m) => this.calculateSimilarity(m.content, content) > 0.5)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  recallSuccessful(type: MemoryType): MemoryEntry[] {
    return this.memories
      .filter((m) => m.type === type && m.success)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  markAsSuccessful(entryId: string): void {
    const entry = this.memories.find((m) => m.id === entryId);
    if (entry) {
      entry.success = true;
      entry.frequency += 1;
      entry.relevance = this.updateRelevance(entry);
    }
  }

  markAsUseful(entryId: string): void {
    const entry = this.memories.find((m) => m.id === entryId);
    if (entry) {
      entry.frequency += 1;
      entry.relevance = this.updateRelevance(entry);
    }
  }

  learnUserPreference(preferenceKey: string, value: unknown): void {
    this.learn(MemoryType.USER_PREFERENCE, JSON.stringify({ [preferenceKey]: value }), {
      preference: preferenceKey,
    });
  }

  getUserPreference(preferenceKey: string): unknown | null {
    const pref = this.memories.find(
      (m) => m.type === MemoryType.USER_PREFERENCE && m.metadata.preference === preferenceKey
    );

    return pref ? JSON.parse(pref.content)[preferenceKey] : null;
  }

  learnCodePattern(language: string, pattern: string, context: string): void {
    this.learn(MemoryType.CODE_PATTERN, pattern, {
      language,
      context,
      category: this.categorizePattern(pattern),
    });
  }

  learnSolution(problem: string, solution: string, framework?: string): void {
    this.learn(MemoryType.TASK_SOLUTION, solution, {
      problem,
      framework,
    });
  }

  learnArchitecturalDecision(decision: string, rationale: string, affectedModules: string[]): void {
    this.learn(MemoryType.PROJECT_PATTERN, decision, {
      rationale,
      affectedModules,
      category: 'architectural_decision'
    });
  }

  learnErrorFix(errorType: string, fix: string, context: string): void {
    this.learn(MemoryType.ERROR_FIX, fix, {
      errorType,
      context,
    });
  }

  private calculateInitialRelevance(type: MemoryType): number {
    const baseRelevance: Record<MemoryType, number> = {
      [MemoryType.TASK_SOLUTION]: 0.9,
      [MemoryType.ERROR_FIX]: 0.85,
      [MemoryType.USER_PREFERENCE]: 0.8,
      [MemoryType.CODE_PATTERN]: 0.7,
      [MemoryType.PROJECT_PATTERN]: 0.65,
      [MemoryType.FRAMEWORK_KNOWLEDGE]: 0.75,
      [MemoryType.OPTIMIZATION]: 0.6,
    };

    return baseRelevance[type] || 0.5;
  }

  private updateRelevance(entry: MemoryEntry): number {
    const recency = (Date.now() - entry.timestamp) / (1000 * 60 * 60 * 24); // Days old
    const recencyScore = Math.exp(-recency / 30); // Exponential decay over 30 days

    const frequencyBoost = Math.log(entry.frequency + 1) * 0.1;
    const successBoost = entry.success ? 0.2 : 0;

    return Math.min(1.0, entry.relevance * recencyScore + frequencyBoost + successBoost);
  }

  private matchesQuery(content: string, query: string): boolean {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    // Exact match
    if (contentLower.includes(queryLower)) return true;

    // Word boundary match
    const words = queryLower.split(/\s+/);
    return words.every((word) => contentLower.includes(word));
  }

  private calculateSimilarity(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = [...words1].filter((w) => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union === 0 ? 0 : intersection / union;
  }

  private categorizePattern(pattern: string): string {
    if (pattern.includes('export')) return 'export';
    if (pattern.includes('import')) return 'import';
    if (pattern.includes('function')) return 'function';
    if (pattern.includes('class')) return 'class';
    if (pattern.includes('const')) return 'const';
    if (pattern.includes('=>')) return 'arrow-function';
    return 'other';
  }

  private pruneIfNeeded(): void {
    if (this.memories.length > this.maxMemories) {
      // Remove lowest relevance memories
      this.memories.sort((a, b) => b.relevance - a.relevance);
      this.memories = this.memories.slice(0, Math.floor(this.maxMemories * 0.9));
    }
  }

  private loadMemories(): void {
    if (fs.existsSync(this.memoryFilePath)) {
      try {
        const data = fs.readFileSync(this.memoryFilePath, 'utf-8');
        this.memories = JSON.parse(data);
      } catch (error) {
        console.error('[Sinter] Failed to load memories:', error);
        this.memories = [];
      }
    }
  }

  private ensureStorageDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      this.save();
    }, 60000); // Save every minute
  }

  save(): void {
    try {
      fs.writeFileSync(this.memoryFilePath, JSON.stringify(this.memories, null, 2));
    } catch (error) {
      console.error('[Sinter] Failed to save memories:', error);
    }
  }

  getMemoryStats(): MemoryStats {
    return {
      totalMemories: this.memories.length,
      memoriesByType: this.groupByType(),
      topMemories: this.memories
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10)
        .map((m) => ({ id: m.id, type: m.type, relevance: m.relevance })),
      averageRelevance:
        this.memories.length > 0
          ? this.memories.reduce((sum, m) => sum + m.relevance, 0) / this.memories.length
          : 0,
    };
  }

  private groupByType(): Record<MemoryType, number> {
    const grouped: Record<MemoryType, number> = {} as Record<MemoryType, number>;

    for (const memory of this.memories) {
      grouped[memory.type] = (grouped[memory.type] || 0) + 1;
    }

    return grouped;
  }

  clear(): void {
    this.memories = [];
    this.save();
  }

  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.save();
  }
}

export interface MemoryStats {
  totalMemories: number;
  memoriesByType: Record<MemoryType, number>;
  topMemories: Array<{ id: string; type: MemoryType; relevance: number }>;
  averageRelevance: number;
}

export const createSilentMemoryCore = (storageDir?: string): SilentMemoryCore => {
  return new SilentMemoryCore(storageDir);
};
