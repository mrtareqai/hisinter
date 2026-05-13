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
exports.VSCodeAPIAdapter = exports.TerminalExecutor = exports.FilesystemMonitor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
/**
 * Real-time filesystem monitoring and operations
 */
class FilesystemMonitor {
    watchers = new Map();
    fileChangeCallbacks = [];
    /**
     * Watch directory for changes
     */
    watchDirectory(dirPath, callback) {
        if (this.watchers.has(dirPath)) {
            return; // Already watching
        }
        try {
            const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
                const fullPath = path.join(dirPath, filename || '');
                const change = {
                    type: eventType,
                    path: fullPath,
                    timestamp: Date.now(),
                };
                // Try to get file size if accessible
                try {
                    const stats = fs.statSync(fullPath);
                    change.size = stats.size;
                }
                catch {
                    // File might have been deleted
                }
                callback(change);
                this.fileChangeCallbacks.forEach((cb) => cb(change));
            });
            this.watchers.set(dirPath, watcher);
        }
        catch (error) {
            console.error(`[v0] Failed to watch directory ${dirPath}:`, error);
        }
    }
    /**
     * Stop watching directory
     */
    stopWatching(dirPath) {
        const watcher = this.watchers.get(dirPath);
        if (watcher) {
            watcher.close();
            this.watchers.delete(dirPath);
        }
    }
    /**
     * Get current filesystem state snapshot
     */
    getSnapshot(dirPath) {
        const snapshot = {};
        try {
            const walk = (dir, prefix) => {
                const files = fs.readdirSync(dir);
                files.slice(0, 50).forEach((file) => {
                    try {
                        const fullPath = path.join(dir, file);
                        const stats = fs.statSync(fullPath);
                        const key = `${prefix}${file}`;
                        snapshot[key] = {
                            type: stats.isDirectory() ? 'dir' : 'file',
                            size: stats.size,
                            modified: stats.mtime.getTime(),
                        };
                        if (stats.isDirectory() && prefix.split('/').length < 3) {
                            walk(fullPath, key + '/');
                        }
                    }
                    catch {
                        // Skip files we can't access
                    }
                });
            };
            walk(dirPath, '');
        }
        catch (error) {
            console.error(`[v0] Failed to get filesystem snapshot:`, error);
        }
        return snapshot;
    }
    /**
     * Check file existence and readability
     */
    canAccessFile(filePath) {
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get file hash for change detection
     */
    getFileHash(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Simple hash for change detection
            return (content.length + content.charCodeAt(0)).toString();
        }
        catch {
            return 'UNREADABLE';
        }
    }
    shutdown() {
        this.watchers.forEach((watcher) => watcher.close());
        this.watchers.clear();
    }
}
exports.FilesystemMonitor = FilesystemMonitor;
/**
 * Terminal execution with streaming and metrics
 */
class TerminalExecutor {
    executionHistory = [];
    /**
     * Execute command with streaming output
     */
    async executeCommand(command, cwd = process.cwd(), onOutput) {
        const id = `term-${Date.now()}`;
        const execution = {
            id,
            command,
            startTime: Date.now(),
            stdout: '',
            stderr: '',
        };
        return new Promise((resolve) => {
            try {
                const process = (0, child_process_1.spawn)('sh', ['-c', command], { cwd });
                process.stdout.on('data', (data) => {
                    const output = data.toString();
                    execution.stdout += output;
                    if (onOutput)
                        onOutput(output);
                });
                process.stderr.on('data', (data) => {
                    const error = data.toString();
                    execution.stderr += error;
                    if (onOutput)
                        onOutput(`ERROR: ${error}`);
                });
                process.on('close', (code) => {
                    execution.endTime = Date.now();
                    execution.exitCode = code || 0;
                    execution.duration = execution.endTime - execution.startTime;
                    this.executionHistory.push(execution);
                    resolve(execution);
                });
            }
            catch (error) {
                execution.endTime = Date.now();
                execution.exitCode = 1;
                execution.stderr = error instanceof Error ? error.message : String(error);
                execution.duration = execution.endTime - execution.startTime;
                this.executionHistory.push(execution);
                resolve(execution);
            }
        });
    }
    /**
     * Execute command synchronously
     */
    executeSync(command, cwd = process.cwd()) {
        const id = `term-sync-${Date.now()}`;
        const startTime = Date.now();
        try {
            const stdout = (0, child_process_1.execSync)(command, { cwd, encoding: 'utf-8' });
            const endTime = Date.now();
            const execution = {
                id,
                command,
                startTime,
                endTime,
                exitCode: 0,
                stdout,
                stderr: '',
                duration: endTime - startTime,
            };
            this.executionHistory.push(execution);
            return execution;
        }
        catch (error) {
            const endTime = Date.now();
            const execution = {
                id,
                command,
                startTime,
                endTime,
                exitCode: error.status || 1,
                stdout: error.stdout ? error.stdout.toString() : '',
                stderr: error.stderr ? error.stderr.toString() : error.message,
                duration: endTime - startTime,
            };
            this.executionHistory.push(execution);
            return execution;
        }
    }
    /**
     * Get execution metrics
     */
    getMetrics() {
        const total = this.executionHistory.length;
        const successful = this.executionHistory.filter((e) => e.exitCode === 0).length;
        const avgDuration = this.executionHistory.reduce((sum, e) => sum + (e.duration || 0), 0) / total || 0;
        return {
            totalExecutions: total,
            successRate: total > 0 ? successful / total : 0,
            averageDuration: avgDuration,
            recentCommands: this.executionHistory
                .slice(-5)
                .map((e) => e.command)
                .reverse(),
        };
    }
    getExecutionHistory() {
        return this.executionHistory;
    }
    clearHistory() {
        this.executionHistory = [];
    }
}
exports.TerminalExecutor = TerminalExecutor;
/**
 * VS Code API adapter for editor integration
 */
class VSCodeAPIAdapter {
    editorState = {
        openFiles: new Set(),
        diagnostics: new Map(),
    };
    /**
     * Simulate VS Code operations for testing
     */
    async openFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                this.editorState.openFiles.add(filePath);
                this.editorState.activeFile = filePath;
                return true;
            }
        }
        catch {
            return false;
        }
        return false;
    }
    /**
     * Close file in editor
     */
    closeFile(filePath) {
        this.editorState.openFiles.delete(filePath);
        if (this.editorState.activeFile === filePath) {
            this.editorState.activeFile = undefined;
        }
    }
    /**
     * Set diagnostics (errors/warnings)
     */
    setDiagnostics(filePath, diagnostics) {
        this.editorState.diagnostics.set(filePath, diagnostics);
    }
    /**
     * Get current editor state
     */
    getEditorState() {
        return {
            openFiles: Array.from(this.editorState.openFiles),
            activeFile: this.editorState.activeFile,
            diagnosticCount: Array.from(this.editorState.diagnostics.values()).flat()
                .length,
        };
    }
    /**
     * Apply quick fix suggestion
     */
    async applyQuickFix(filePath, fix) {
        try {
            if (!fs.existsSync(filePath))
                return false;
            let content = fs.readFileSync(filePath, 'utf-8');
            content = content.replace(fix.find, fix.replace);
            fs.writeFileSync(filePath, content);
            return true;
        }
        catch (error) {
            console.error('[v0] Failed to apply quick fix:', error);
            return false;
        }
    }
    /**
     * Insert code snippet at position
     */
    async insertCodeSnippet(filePath, code, lineNumber) {
        try {
            const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
            lines.splice(lineNumber, 0, code);
            fs.writeFileSync(filePath, lines.join('\n'));
            return true;
        }
        catch (error) {
            console.error('[v0] Failed to insert code snippet:', error);
            return false;
        }
    }
    /**
     * Format document
     */
    async formatDocument(filePath) {
        try {
            const command = `prettier --write "${filePath}" 2>/dev/null || true`;
            (0, child_process_1.execSync)(command);
            return true;
        }
        catch {
            return false;
        }
    }
    getState() {
        return this.editorState;
    }
}
exports.VSCodeAPIAdapter = VSCodeAPIAdapter;
//# sourceMappingURL=environmentAdapters.js.map