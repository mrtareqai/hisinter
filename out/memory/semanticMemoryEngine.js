"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGlobalSemanticMemory = exports.globalSemanticMemory = exports.SemanticMemoryEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SemanticMemoryEngine {
    projectMemory = new Map();
    allTasks = [];
    globalPatterns = [];
    memoryFile;
    updateInterval = null;
    constructor(workspaceRoot) {
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
    rememberTask(task) {
        const memory = {
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
        const project = this.projectMemory.get(task.projectId);
        project.pastTasks.push(memory);
        project.lastUpdated = Date.now();
        console.log(`[SemanticMemoryEngine] Remembered task: ${task.description}`);
    }
    /**
     * Remember a code pattern discovered during execution
     */
    rememberPattern(pattern) {
        const existing = this.globalPatterns.find(p => p.name === pattern.name && p.fileType === pattern.fileType);
        if (existing) {
            existing.frequency++;
            existing.lastSeen = Date.now();
            existing.reliability = Math.min(1, existing.reliability + 0.05);
            return existing;
        }
        const codePattern = {
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
    rememberPreference(projectId, key, value) {
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
    retrieveSimilarTasks(query, projectId, limit = 5) {
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
    getSuggestedApproach(query, projectId) {
        const suggestions = this.retrieveSimilarTasks(query, projectId, 1);
        return suggestions.length > 0 ? suggestions[0] : undefined;
    }
    /**
     * Get project memory
     */
    getProjectMemory(projectId) {
        return this.projectMemory.get(projectId);
    }
    /**
     * Update project code style profile
     */
    updateCodeStyle(projectId, changes) {
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
    getLearningStats() {
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
    clearAllMemory() {
        this.projectMemory.clear();
        this.allTasks = [];
        this.globalPatterns = [];
        console.log('[SemanticMemoryEngine] All memory cleared');
    }
    /**
     * Export memory as JSON
     */
    exportMemory() {
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
    saveMemory() {
        try {
            const data = this.exportMemory();
            fs.writeFileSync(this.memoryFile, data, 'utf-8');
        }
        catch (error) {
            console.error('[SemanticMemoryEngine] Error saving memory:', error);
        }
    }
    /**
     * Private: Load memory from disk
     */
    loadMemory() {
        try {
            if (fs.existsSync(this.memoryFile)) {
                const data = JSON.parse(fs.readFileSync(this.memoryFile, 'utf-8'));
                if (data.tasks) {
                    this.allTasks = data.tasks;
                }
                if (data.projects) {
                    data.projects.forEach((p) => {
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
        }
        catch (error) {
            console.error('[SemanticMemoryEngine] Error loading memory:', error);
        }
    }
    /**
     * Private: Ensure memory directory exists
     */
    ensureMemoryDirectory(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    /**
     * Cleanup on dispose
     */
    dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.saveMemory();
        console.log('[SemanticMemoryEngine] Disposed');
    }
}
exports.SemanticMemoryEngine = SemanticMemoryEngine;
/**
 * Initialize global semantic memory engine
 */
function initializeGlobalSemanticMemory(workspaceRoot) {
    exports.globalSemanticMemory = new SemanticMemoryEngine(workspaceRoot);
    return exports.globalSemanticMemory;
}
exports.initializeGlobalSemanticMemory = initializeGlobalSemanticMemory;
//# sourceMappingURL=semanticMemoryEngine.js.map