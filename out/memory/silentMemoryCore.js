"use strict";
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
exports.createSilentMemoryCore = exports.SilentMemoryCore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const agent_1 = require("../types/agent");
const uuid_1 = require("uuid");
class SilentMemoryCore {
    memories = [];
    memoryFilePath;
    maxMemories = 1000;
    autoSaveInterval = null;
    constructor(storageDir = path.join(process.cwd(), '.sinter')) {
        this.memoryFilePath = path.join(storageDir, 'memory.json');
        this.ensureStorageDir(storageDir);
        this.loadMemories();
        this.startAutoSave();
    }
    learn(type, content, metadata = {}) {
        const entry = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            type,
            content,
            metadata,
            relevance: this.calculateInitialRelevance(type),
            frequency: 1,
            success: metadata.success || true,
        };
        this.memories.push(entry);
        this.pruneIfNeeded();
    }
    learnFromExecution(result, type) {
        this.learn(type, JSON.stringify(result), {
            success: result.success,
            duration: result.duration,
            stepId: result.stepId,
        });
    }
    recall(type, query, limit = 5) {
        let filtered = this.memories.filter((m) => m.type === type);
        if (query) {
            filtered = filtered.filter((m) => this.matchesQuery(m.content, query));
        }
        return filtered.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
    }
    recallSimilar(content, limit = 3) {
        return this.memories
            .filter((m) => this.calculateSimilarity(m.content, content) > 0.5)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, limit);
    }
    recallSuccessful(type) {
        return this.memories
            .filter((m) => m.type === type && m.success)
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 5);
    }
    markAsSuccessful(entryId) {
        const entry = this.memories.find((m) => m.id === entryId);
        if (entry) {
            entry.success = true;
            entry.frequency += 1;
            entry.relevance = this.updateRelevance(entry);
        }
    }
    markAsUseful(entryId) {
        const entry = this.memories.find((m) => m.id === entryId);
        if (entry) {
            entry.frequency += 1;
            entry.relevance = this.updateRelevance(entry);
        }
    }
    learnUserPreference(preferenceKey, value) {
        this.learn(agent_1.MemoryType.USER_PREFERENCE, JSON.stringify({ [preferenceKey]: value }), {
            preference: preferenceKey,
        });
    }
    getUserPreference(preferenceKey) {
        const pref = this.memories.find((m) => m.type === agent_1.MemoryType.USER_PREFERENCE && m.metadata.preference === preferenceKey);
        return pref ? JSON.parse(pref.content)[preferenceKey] : null;
    }
    learnCodePattern(language, pattern, context) {
        this.learn(agent_1.MemoryType.CODE_PATTERN, pattern, {
            language,
            context,
            category: this.categorizePattern(pattern),
        });
    }
    learnSolution(problem, solution, framework) {
        this.learn(agent_1.MemoryType.TASK_SOLUTION, solution, {
            problem,
            framework,
        });
    }
    learnErrorFix(errorType, fix, context) {
        this.learn(agent_1.MemoryType.ERROR_FIX, fix, {
            errorType,
            context,
        });
    }
    calculateInitialRelevance(type) {
        const baseRelevance = {
            [agent_1.MemoryType.TASK_SOLUTION]: 0.9,
            [agent_1.MemoryType.ERROR_FIX]: 0.85,
            [agent_1.MemoryType.USER_PREFERENCE]: 0.8,
            [agent_1.MemoryType.CODE_PATTERN]: 0.7,
            [agent_1.MemoryType.PROJECT_PATTERN]: 0.65,
            [agent_1.MemoryType.FRAMEWORK_KNOWLEDGE]: 0.75,
            [agent_1.MemoryType.OPTIMIZATION]: 0.6,
        };
        return baseRelevance[type] || 0.5;
    }
    updateRelevance(entry) {
        const recency = (Date.now() - entry.timestamp) / (1000 * 60 * 60 * 24); // Days old
        const recencyScore = Math.exp(-recency / 30); // Exponential decay over 30 days
        const frequencyBoost = Math.log(entry.frequency + 1) * 0.1;
        const successBoost = entry.success ? 0.2 : 0;
        return Math.min(1.0, entry.relevance * recencyScore + frequencyBoost + successBoost);
    }
    matchesQuery(content, query) {
        const queryLower = query.toLowerCase();
        const contentLower = content.toLowerCase();
        // Exact match
        if (contentLower.includes(queryLower))
            return true;
        // Word boundary match
        const words = queryLower.split(/\s+/);
        return words.every((word) => contentLower.includes(word));
    }
    calculateSimilarity(content1, content2) {
        const words1 = new Set(content1.toLowerCase().split(/\s+/));
        const words2 = new Set(content2.toLowerCase().split(/\s+/));
        const intersection = [...words1].filter((w) => words2.has(w)).length;
        const union = new Set([...words1, ...words2]).size;
        return union === 0 ? 0 : intersection / union;
    }
    categorizePattern(pattern) {
        if (pattern.includes('export'))
            return 'export';
        if (pattern.includes('import'))
            return 'import';
        if (pattern.includes('function'))
            return 'function';
        if (pattern.includes('class'))
            return 'class';
        if (pattern.includes('const'))
            return 'const';
        if (pattern.includes('=>'))
            return 'arrow-function';
        return 'other';
    }
    pruneIfNeeded() {
        if (this.memories.length > this.maxMemories) {
            // Remove lowest relevance memories
            this.memories.sort((a, b) => b.relevance - a.relevance);
            this.memories = this.memories.slice(0, Math.floor(this.maxMemories * 0.9));
        }
    }
    loadMemories() {
        if (fs.existsSync(this.memoryFilePath)) {
            try {
                const data = fs.readFileSync(this.memoryFilePath, 'utf-8');
                this.memories = JSON.parse(data);
            }
            catch (error) {
                console.error('[Sinter] Failed to load memories:', error);
                this.memories = [];
            }
        }
    }
    ensureStorageDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.save();
        }, 60000); // Save every minute
    }
    save() {
        try {
            fs.writeFileSync(this.memoryFilePath, JSON.stringify(this.memories, null, 2));
        }
        catch (error) {
            console.error('[Sinter] Failed to save memories:', error);
        }
    }
    getMemoryStats() {
        return {
            totalMemories: this.memories.length,
            memoriesByType: this.groupByType(),
            topMemories: this.memories
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, 10)
                .map((m) => ({ id: m.id, type: m.type, relevance: m.relevance })),
            averageRelevance: this.memories.length > 0
                ? this.memories.reduce((sum, m) => sum + m.relevance, 0) / this.memories.length
                : 0,
        };
    }
    groupByType() {
        const grouped = {};
        for (const memory of this.memories) {
            grouped[memory.type] = (grouped[memory.type] || 0) + 1;
        }
        return grouped;
    }
    clear() {
        this.memories = [];
        this.save();
    }
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.save();
    }
}
exports.SilentMemoryCore = SilentMemoryCore;
const createSilentMemoryCore = (storageDir) => {
    return new SilentMemoryCore(storageDir);
};
exports.createSilentMemoryCore = createSilentMemoryCore;
//# sourceMappingURL=silentMemoryCore.js.map