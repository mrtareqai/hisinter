export interface FileChange {
    type: 'create' | 'modify' | 'delete';
    path: string;
    timestamp: number;
    size?: number;
}
export interface TerminalExecution {
    id: string;
    command: string;
    startTime: number;
    endTime?: number;
    exitCode?: number;
    stdout: string;
    stderr: string;
    duration?: number;
}
/**
 * Real-time filesystem monitoring and operations
 */
export declare class FilesystemMonitor {
    private watchers;
    private fileChangeCallbacks;
    /**
     * Watch directory for changes
     */
    watchDirectory(dirPath: string, callback: (change: FileChange) => void): void;
    /**
     * Stop watching directory
     */
    stopWatching(dirPath: string): void;
    /**
     * Get current filesystem state snapshot
     */
    getSnapshot(dirPath: string): Record<string, any>;
    /**
     * Check file existence and readability
     */
    canAccessFile(filePath: string): boolean;
    /**
     * Get file hash for change detection
     */
    getFileHash(filePath: string): string;
    shutdown(): void;
}
/**
 * Terminal execution with streaming and metrics
 */
export declare class TerminalExecutor {
    private executionHistory;
    /**
     * Execute command with streaming output
     */
    executeCommand(command: string, cwd?: string, onOutput?: (output: string) => void): Promise<TerminalExecution>;
    /**
     * Execute command synchronously
     */
    executeSync(command: string, cwd?: string): TerminalExecution;
    /**
     * Get execution metrics
     */
    getMetrics(): {
        totalExecutions: number;
        successRate: number;
        averageDuration: number;
        recentCommands: string[];
    };
    getExecutionHistory(): TerminalExecution[];
    clearHistory(): void;
}
/**
 * VS Code API adapter for editor integration
 */
export declare class VSCodeAPIAdapter {
    private editorState;
    /**
     * Simulate VS Code operations for testing
     */
    openFile(filePath: string): Promise<boolean>;
    /**
     * Close file in editor
     */
    closeFile(filePath: string): void;
    /**
     * Set diagnostics (errors/warnings)
     */
    setDiagnostics(filePath: string, diagnostics: any[]): void;
    /**
     * Get current editor state
     */
    getEditorState(): {
        openFiles: string[];
        activeFile?: string;
        diagnosticCount: number;
    };
    /**
     * Apply quick fix suggestion
     */
    applyQuickFix(filePath: string, fix: any): Promise<boolean>;
    /**
     * Insert code snippet at position
     */
    insertCodeSnippet(filePath: string, code: string, lineNumber: number): Promise<boolean>;
    /**
     * Format document
     */
    formatDocument(filePath: string): Promise<boolean>;
    getState(): {
        openFiles: Set<string>;
        activeFile?: string;
        diagnostics: Map<string, any[]>;
    };
}
