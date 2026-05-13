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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ProjectWorldModel {
    state;
    persistPath;
    updateInterval = null;
    constructor(projectRoot) {
        this.persistPath = path.join(projectRoot, '.sinter', 'world-model.json');
        this.state = {
            projectRoot,
            lastUpdated: Date.now(),
            fileStructure: new Map(),
            patterns: new Map(),
            dependencies: [],
            operationHistory: [],
            anomalies: [],
            architecturePatterns: [],
            codeConventions: {},
            performanceMetrics: {},
            failureModes: new Map(),
        };
        this.loadFromDisk();
    }
    /**
     * Load world model from persistent storage
     */
    loadFromDisk() {
        try {
            if (fs.existsSync(this.persistPath)) {
                const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf-8'));
                this.state = {
                    ...data,
                    fileStructure: new Map(data.fileStructure || []),
                    patterns: new Map(data.patterns || []),
                    failureModes: new Map(data.failureModes || []),
                };
                console.log('[v0] Loaded ProjectWorldModel from disk');
            }
        }
        catch (error) {
            console.warn('[v0] Failed to load world model:', error);
        }
    }
    /**
     * Save world model to persistent storage
     */
    saveToDisk() {
        try {
            const dir = path.dirname(this.persistPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const serializable = {
                ...this.state,
                fileStructure: Array.from(this.state.fileStructure.entries()),
                patterns: Array.from(this.state.patterns.entries()),
                failureModes: Array.from(this.state.failureModes.entries()),
            };
            fs.writeFileSync(this.persistPath, JSON.stringify(serializable, null, 2));
        }
        catch (error) {
            console.error('[v0] Failed to save world model:', error);
        }
    }
    /**
     * Scan project structure and update file information
     */
    scanProjectStructure() {
        const scan = (dir, depth = 0) => {
            if (depth > 10)
                return; // Limit recursion depth
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.name.startsWith('.'))
                        continue;
                    const fullPath = path.join(dir, entry.name);
                    const relPath = path.relative(this.state.projectRoot, fullPath);
                    if (entry.isDirectory()) {
                        this.state.fileStructure.set(relPath, {
                            type: 'dir',
                            size: 0,
                            modified: Date.now(),
                        });
                        scan(fullPath, depth + 1);
                    }
                    else {
                        const stats = fs.statSync(fullPath);
                        this.state.fileStructure.set(relPath, {
                            type: 'file',
                            size: stats.size,
                            modified: stats.mtimeMs,
                        });
                    }
                }
            }
            catch (error) {
                console.warn(`[v0] Failed to scan ${dir}:`, error);
            }
        };
        scan(this.state.projectRoot);
        this.state.lastUpdated = Date.now();
    }
    /**
     * Record a successful or failed operation
     */
    recordOperation(operation, success, duration, resourceUsed, outcome) {
        this.state.operationHistory.push({
            timestamp: Date.now(),
            operation,
            success,
            duration,
            resourceUsed,
            outcome,
        });
        // Keep only last 1000 operations
        if (this.state.operationHistory.length > 1000) {
            this.state.operationHistory = this.state.operationHistory.slice(-1000);
        }
    }
    /**
     * Detect and record anomalies in execution
     */
    recordAnomaly(type, description, severity, context) {
        this.state.anomalies.push({
            timestamp: Date.now(),
            type,
            description,
            severity,
            context: context || {},
        });
        // Keep only last 500 anomalies
        if (this.state.anomalies.length > 500) {
            this.state.anomalies = this.state.anomalies.slice(-500);
        }
    }
    /**
     * Learn a new pattern in the codebase
     */
    learnPattern(name, description, locations, relatedPatterns = []) {
        const existing = this.state.patterns.get(name);
        if (existing) {
            existing.frequency += 1;
            existing.locations = Array.from(new Set([...existing.locations, ...locations]));
            existing.confidence = Math.min(existing.confidence + 0.05, 1.0);
        }
        else {
            this.state.patterns.set(name, {
                name,
                description,
                locations,
                frequency: 1,
                relatedPatterns,
                confidence: 0.6,
            });
        }
    }
    /**
     * Register a dependency relationship
     */
    registerDependency(from, to, type, strength = 1.0) {
        const existing = this.state.dependencies.find((d) => d.from === from && d.to === to);
        if (existing) {
            existing.strength += strength;
        }
        else {
            this.state.dependencies.push({ from, to, type, strength });
        }
    }
    /**
     * Record a failure mode and its resolution
     */
    recordFailureMode(failureType, resolution) {
        const existing = this.state.failureModes.get(failureType);
        if (existing) {
            existing.frequency += 1;
        }
        else {
            this.state.failureModes.set(failureType, {
                frequency: 1,
                resolution,
            });
        }
    }
    /**
     * Get similar past operations
     */
    getSimilarOperations(operation, limit = 5) {
        return this.state.operationHistory
            .filter((op) => op.operation.includes(operation))
            .slice(-limit)
            .reverse();
    }
    /**
     * Predict operation outcome based on history
     */
    predictOperationOutcome(operation) {
        const similar = this.state.operationHistory.filter((op) => op.operation === operation);
        if (similar.length === 0) {
            return { successProbability: 0.5, avgDuration: 5000, avgResource: 256 };
        }
        const successful = similar.filter((op) => op.success).length;
        const avgDuration = similar.reduce((sum, op) => sum + op.duration, 0) / similar.length;
        const avgResource = similar.reduce((sum, op) => sum + op.resourceUsed, 0) / similar.length;
        return {
            successProbability: successful / similar.length,
            avgDuration,
            avgResource,
        };
    }
    /**
     * Get intelligence about a file or directory
     */
    getFileIntelligence(filePath) {
        const info = this.state.fileStructure.get(filePath);
        const relatedPatterns = Array.from(this.state.patterns.values()).filter((p) => p.locations.some((loc) => loc.includes(filePath)));
        const dependencies = this.state.dependencies.filter((d) => d.from === filePath || d.to === filePath);
        return {
            exists: !!info,
            type: info?.type,
            size: info?.size,
            lastModified: info?.modified,
            relatedPatterns,
            dependencies,
        };
    }
    /**
     * Get overall project intelligence summary
     */
    getProjectIntelligence() {
        const files = Array.from(this.state.fileStructure.values()).filter((f) => f.type === 'file');
        const dirs = Array.from(this.state.fileStructure.values()).filter((f) => f.type === 'dir');
        const successful = this.state.operationHistory.filter((op) => op.success).length;
        const avgDuration = this.state.operationHistory.length > 0
            ? this.state.operationHistory.reduce((sum, op) => sum + op.duration, 0) /
                this.state.operationHistory.length
            : 0;
        return {
            fileCount: files.length,
            dirCount: dirs.length,
            patternCount: this.state.patterns.size,
            dependencyCount: this.state.dependencies.length,
            anomalyCount: this.state.anomalies.length,
            successRate: this.state.operationHistory.length > 0
                ? successful / this.state.operationHistory.length
                : 0,
            avgOperationDuration: avgDuration,
            lastScanTime: this.state.lastUpdated,
        };
    }
    /**
     * Export full state
     */
    getState() {
        return this.state;
    }
    /**
     * Start periodic sync to disk
     */
    startPeriodicSync(intervalMs = 30000) {
        this.updateInterval = setInterval(() => {
            this.saveToDisk();
        }, intervalMs);
    }
    /**
     * Stop periodic sync
     */
    stopPeriodicSync() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        this.stopPeriodicSync();
        this.saveToDisk();
    }
}
exports.default = ProjectWorldModel;
//# sourceMappingURL=projectWorldModel.js.map