import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';

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
export class FilesystemMonitor {
  private watchers: Map<string, any> = new Map();
  private fileChangeCallbacks: ((change: FileChange) => void)[] = [];

  /**
   * Watch directory for changes
   */
  watchDirectory(dirPath: string, callback: (change: FileChange) => void): void {
    if (this.watchers.has(dirPath)) {
      return; // Already watching
    }

    try {
      const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
        const fullPath = path.join(dirPath, filename || '');
        const change: FileChange = {
          type: eventType as 'create' | 'modify' | 'delete',
          path: fullPath,
          timestamp: Date.now(),
        };

        // Try to get file size if accessible
        try {
          const stats = fs.statSync(fullPath);
          change.size = stats.size;
        } catch {
          // File might have been deleted
        }

        callback(change);
        this.fileChangeCallbacks.forEach((cb) => cb(change));
      });

      this.watchers.set(dirPath, watcher);
    } catch (error) {
      console.error(`[v0] Failed to watch directory ${dirPath}:`, error);
    }
  }

  /**
   * Stop watching directory
   */
  stopWatching(dirPath: string): void {
    const watcher = this.watchers.get(dirPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(dirPath);
    }
  }

  /**
   * Get current filesystem state snapshot
   */
  getSnapshot(dirPath: string): Record<string, any> {
    const snapshot: Record<string, any> = {};

    try {
      const walk = (dir: string, prefix: string) => {
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
          } catch {
            // Skip files we can't access
          }
        });
      };

      walk(dirPath, '');
    } catch (error) {
      console.error(`[v0] Failed to get filesystem snapshot:`, error);
    }

    return snapshot;
  }

  /**
   * Check file existence and readability
   */
  canAccessFile(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file hash for change detection
   */
  getFileHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Simple hash for change detection
      return (content.length + content.charCodeAt(0)).toString();
    } catch {
      return 'UNREADABLE';
    }
  }

  shutdown(): void {
    this.watchers.forEach((watcher) => watcher.close());
    this.watchers.clear();
  }
}

/**
 * Terminal execution with streaming and metrics
 */
export class TerminalExecutor {
  private executionHistory: TerminalExecution[] = [];

  /**
   * Execute command with streaming output
   */
  async executeCommand(
    command: string,
    cwd: string = process.cwd(),
    onOutput?: (output: string) => void
  ): Promise<TerminalExecution> {
    const id = `term-${Date.now()}`;
    const execution: TerminalExecution = {
      id,
      command,
      startTime: Date.now(),
      stdout: '',
      stderr: '',
    };

    return new Promise((resolve) => {
      try {
        const process = spawn('sh', ['-c', command], { cwd });

        process.stdout.on('data', (data) => {
          const output = data.toString();
          execution.stdout += output;
          if (onOutput) onOutput(output);
        });

        process.stderr.on('data', (data) => {
          const error = data.toString();
          execution.stderr += error;
          if (onOutput) onOutput(`ERROR: ${error}`);
        });

        process.on('close', (code) => {
          execution.endTime = Date.now();
          execution.exitCode = code || 0;
          execution.duration = execution.endTime - execution.startTime;
          this.executionHistory.push(execution);
          resolve(execution);
        });
      } catch (error) {
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
  executeSync(command: string, cwd: string = process.cwd()): TerminalExecution {
    const id = `term-sync-${Date.now()}`;
    const startTime = Date.now();

    try {
      const stdout = execSync(command, { cwd, encoding: 'utf-8' });
      const endTime = Date.now();

      const execution: TerminalExecution = {
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
    } catch (error: any) {
      const endTime = Date.now();

      const execution: TerminalExecution = {
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
  getMetrics(): {
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    recentCommands: string[];
  } {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter((e) => e.exitCode === 0).length;
    const avgDuration =
      this.executionHistory.reduce((sum, e) => sum + (e.duration || 0), 0) / total || 0;

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

  getExecutionHistory(): TerminalExecution[] {
    return this.executionHistory;
  }

  clearHistory(): void {
    this.executionHistory = [];
  }
}

/**
 * VS Code API adapter for editor integration
 */
export class VSCodeAPIAdapter {
  private editorState: {
    openFiles: Set<string>;
    activeFile?: string;
    diagnostics: Map<string, any[]>;
  } = {
    openFiles: new Set(),
    diagnostics: new Map(),
  };

  /**
   * Simulate VS Code operations for testing
   */
  async openFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        this.editorState.openFiles.add(filePath);
        this.editorState.activeFile = filePath;
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  /**
   * Close file in editor
   */
  closeFile(filePath: string): void {
    this.editorState.openFiles.delete(filePath);
    if (this.editorState.activeFile === filePath) {
      this.editorState.activeFile = undefined;
    }
  }

  /**
   * Set diagnostics (errors/warnings)
   */
  setDiagnostics(filePath: string, diagnostics: any[]): void {
    this.editorState.diagnostics.set(filePath, diagnostics);
  }

  /**
   * Get current editor state
   */
  getEditorState(): {
    openFiles: string[];
    activeFile?: string;
    diagnosticCount: number;
  } {
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
  async applyQuickFix(filePath: string, fix: any): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) return false;

      let content = fs.readFileSync(filePath, 'utf-8');
      content = content.replace(fix.find, fix.replace);
      fs.writeFileSync(filePath, content);
      return true;
    } catch (error) {
      console.error('[v0] Failed to apply quick fix:', error);
      return false;
    }
  }

  /**
   * Insert code snippet at position
   */
  async insertCodeSnippet(
    filePath: string,
    code: string,
    lineNumber: number
  ): Promise<boolean> {
    try {
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
      lines.splice(lineNumber, 0, code);
      fs.writeFileSync(filePath, lines.join('\n'));
      return true;
    } catch (error) {
      console.error('[v0] Failed to insert code snippet:', error);
      return false;
    }
  }

  /**
   * Format document
   */
  async formatDocument(filePath: string): Promise<boolean> {
    try {
      const command = `prettier --write "${filePath}" 2>/dev/null || true`;
      execSync(command);
      return true;
    } catch {
      return false;
    }
  }

  getState() {
    return this.editorState;
  }
}
