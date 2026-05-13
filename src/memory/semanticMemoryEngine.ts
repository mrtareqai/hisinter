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

import * as fs from 'fs';
import * as path from 'path';

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
  reliability: number; // 0-1, based on success rate
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

export class SemanticMemoryEngine {
  private projectMemory = new Map<string, ProjectMemory>();
  private allTasks: TaskMemory[] = [];
  private globalPatterns: CodePattern[] = [];
  private memoryFile: string;
  private updateInterval: NodeJS.Timer | null = null;

  constructor(workspaceRoot?: string) {
    const memDir = workspaceRoot 
      ? path.join(workspaceRoot, '.sinter', 'memory')
      : path.join(process.cwd(), '.sinter', 'memory');
    
    this.memoryFile = path.join(memDir, 'semantic-memory.json');
    this.ensureMemoryDirectory(memDir);
    this.loadMemory();
    
    // Auto-save memory periodically
    this.updateInterval = setInterval(() => this.saveMemory(), 30000);
    
    console.log('[SemanticMemoryEngine] Initialized');
  }

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
  }): void {
    const memory: TaskMemory = {
      id: task.id,
      description: task.description,
      timestamp: Date.now(),
      duration: task.duration,
      success: task.success,
      approach: task.approach,
      codeChanges: task.codeChanges,
      lessons: task.lessons,
      projectContext: task.projectId,
      relevanceScore: 1.0
    };

    this.allTasks.push(memory);

    // Update project memory
    if (!this.projectMemory.has(task.projectId)) {
      this.projectMemory.set(task.projectId, {
        projectId: task.projectId,
        projectName: task.projectId,
        codeStyleProfile: {
          indentation: 2,
          useSemicolons: true,
          lineLength: 80,
          preferredPatterns: []
        },
        preferences: new Map(),
        patterns: [],
        pastTasks: [],
        lastUpdated: Date.now()
      });
    }

    const project = this.projectMemory.get(task.projectId)!;
    project.pastTasks.push(memory);
    project.lastUpdated = Date.now();

    console.log(`[SemanticMemoryEngine] Remembered task: ${task.description}`);
  }

  /**
   * Remember a code pattern discovered during execution
   */
  rememberPattern(pattern: {
    name: string;
    description: string;
    fileType: string;
    pattern: string;
    reliability: number;
  }): CodePattern {
    const existing = this.globalPatterns.find(p => 
      p.name === pattern.name && p.fileType === pattern.fileType
    );

    if (existing) {
      existing.frequency++;
      existing.lastSeen = Date.now();
      existing.reliability = Math.min(1, existing.reliability + 0.05);
      return existing;
    }

    const codePattern: CodePattern = {
      id: `pattern:${Date.now()}`,
      ...pattern,
      frequency: 1,
      lastSeen: Date.now()
    };

    this.globalPatterns.push(codePattern);
    console.log(`[SemanticMemoryEngine] Learned pattern: ${pattern.name}`);
    
    return codePattern;
  }

  /**
   * Remember a user preference
   */
  rememberPreference(projectId: string, key: string, value: any): void {
    const project = this.projectMemory.get(projectId);
    if (project) {
      project.preferences.set(key, value);
      project.lastUpdated = Date.now();
      console.log(`[SemanticMemoryEngine] Remembered preference: ${key}`);
    }
  }

  /**
   * Retrieve similar tasks for current problem
   */
  retrieveSimilarTasks(query: string, projectId: string, limit: number = 5): MemorySuggestion[] {
    const project = this.projectMemory.get(projectId);
    if (!project || project.pastTasks.length === 0) {
      return [];
    }

    // Calculate similarity scores (simple word matching)
    const queryWords = query.toLowerCase().split(/\s+/);
    
    const suggestions = project.pastTasks
      .map(task => {
        const taskWords = task.description.toLowerCase().split(/\s+/);
        const commonWords = queryWords.filter(w => taskWords.includes(w)).length;
        const similarity = commonWords / Math.max(queryWords.length, taskWords.length);

        return {
          taskId: task.id,
          description: task.description,
          similarity,
          approach: task.approach,
          lessons: task.lessons,
          duration: task.duration,
          reliability: task.success ? 1.0 : 0.5
        };
      })
      .filter(s => s.similarity > 0.2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return suggestions;
  }

  /**
   * Get suggested approach for a task
   */
  getSuggestedApproach(query: string, projectId: string): MemorySuggestion | undefined {
    const suggestions = this.retrieveSimilarTasks(query, projectId, 1);
    return suggestions.length > 0 ? suggestions[0] : undefined;
  }

  /**
   * Get project memory
   */
  getProjectMemory(projectId: string): ProjectMemory | undefined {
    return this.projectMemory.get(projectId);
  }

  /**
   * Update project code style profile
   */
  updateCodeStyle(projectId: string, changes: Partial<ProjectMemory['codeStyleProfile']>): void {
    let project = this.projectMemory.get(projectId);
    
    if (!project) {
      project = {
        projectId,
        projectName: projectId,
        codeStyleProfile: {
          indentation: 2,
          useSemicolons: true,
          lineLength: 80,
          preferredPatterns: []
        },
        preferences: new Map(),
        patterns: [],
        pastTasks: [],
        lastUpdated: Date.now()
      };
      this.projectMemory.set(projectId, project);
    }

    project.codeStyleProfile = { ...project.codeStyleProfile, ...changes };
    project.lastUpdated = Date.now();
    
    console.log(`[SemanticMemoryEngine] Updated code style for ${projectId}`);
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    totalTasksLearned: number;
    projectsTracked: number;
    patternsLearned: number;
    averageTaskDuration: number;
    successRate: number;
  } {
    const successCount = this.allTasks.filter(t => t.success).length;
    const avgDuration = this.allTasks.length > 0
      ? this.allTasks.reduce((sum, t) => sum + t.duration, 0) / this.allTasks.length
      : 0;

    return {
      totalTasksLearned: this.allTasks.length,
      projectsTracked: this.projectMemory.size,
      patternsLearned: this.globalPatterns.length,
      averageTaskDuration: avgDuration,
      successRate: this.allTasks.length > 0 ? successCount / this.allTasks.length : 0
    };
  }

  /**
   * Clear all memory (destructive)
   */
  clearAllMemory(): void {
    this.projectMemory.clear();
    this.allTasks = [];
    this.globalPatterns = [];
    console.log('[SemanticMemoryEngine] All memory cleared');
  }

  /**
   * Export memory as JSON
   */
  exportMemory(): string {
    const data = {
      timestamp: Date.now(),
      tasks: this.allTasks,
      projects: Array.from(this.projectMemory.values()).map(p => ({
        ...p,
        preferences: Array.from(p.preferences.entries())
      })),
      patterns: this.globalPatterns,
      stats: this.getLearningStats()
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Private: Save memory to disk
   */
  private saveMemory(): void {
    try {
      const data = this.exportMemory();
      fs.writeFileSync(this.memoryFile, data, 'utf-8');
    } catch (error) {
      console.error('[SemanticMemoryEngine] Error saving memory:', error);
    }
  }

  /**
   * Private: Load memory from disk
   */
  private loadMemory(): void {
    try {
      if (fs.existsSync(this.memoryFile)) {
        const data = JSON.parse(fs.readFileSync(this.memoryFile, 'utf-8'));
        
        if (data.tasks) {
          this.allTasks = data.tasks;
        }
        if (data.projects) {
          data.projects.forEach((p: any) => {
            this.projectMemory.set(p.projectId, {
              ...p,
              preferences: new Map(p.preferences || [])
            });
          });
        }
        if (data.patterns) {
          this.globalPatterns = data.patterns;
        }
        
        console.log('[SemanticMemoryEngine] Memory loaded from disk');
      }
    } catch (error) {
      console.error('[SemanticMemoryEngine] Error loading memory:', error);
    }
  }

  /**
   * Private: Ensure memory directory exists
   */
  private ensureMemoryDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Cleanup on dispose
   */
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.saveMemory();
    console.log('[SemanticMemoryEngine] Disposed');
  }
}

// Global instance
export let globalSemanticMemory: SemanticMemoryEngine;

/**
 * Initialize global semantic memory engine
 */
export function initializeGlobalSemanticMemory(workspaceRoot?: string): SemanticMemoryEngine {
  globalSemanticMemory = new SemanticMemoryEngine(workspaceRoot);
  return globalSemanticMemory;
}
