import * as fs from 'fs';
import * as path from 'path';

export interface ProjectPattern {
  name: string;
  description: string;
  locations: string[];
  frequency: number;
  relatedPatterns: string[];
  confidence: number;
}

export interface ProjectDependency {
  from: string;
  to: string;
  type: 'import' | 'file' | 'package' | 'api';
  strength: number;
}

export interface OperationHistory {
  timestamp: number;
  operation: string;
  success: boolean;
  duration: number;
  resourceUsed: number;
  outcome: string;
}

export interface AnomalyRecord {
  timestamp: number;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  context: Record<string, unknown>;
}

export interface ProjectWorldState {
  projectRoot: string;
  lastUpdated: number;
  fileStructure: Map<string, { type: 'file' | 'dir'; size: number; modified: number }>;
  patterns: Map<string, ProjectPattern>;
  dependencies: ProjectDependency[];
  operationHistory: OperationHistory[];
  anomalies: AnomalyRecord[];
  architecturePatterns: string[];
  codeConventions: Record<string, string>;
  performanceMetrics: Record<string, number>;
  failureModes: Map<string, { frequency: number; resolution: string }>;
}

export default class ProjectWorldModel {
  private state: ProjectWorldState;
  private persistPath: string;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(projectRoot: string) {
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
  private loadFromDisk(): void {
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
    } catch (error) {
      console.warn('[v0] Failed to load world model:', error);
    }
  }

  /**
   * Save world model to persistent storage
   */
  public saveToDisk(): void {
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
    } catch (error) {
      console.error('[v0] Failed to save world model:', error);
    }
  }

  /**
   * Scan project structure and update file information
   */
  public scanProjectStructure(): void {
    const scan = (dir: string, depth = 0): void => {
      if (depth > 10) return; // Limit recursion depth

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;

          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(this.state.projectRoot, fullPath);

          if (entry.isDirectory()) {
            this.state.fileStructure.set(relPath, {
              type: 'dir',
              size: 0,
              modified: Date.now(),
            });
            scan(fullPath, depth + 1);
          } else {
            const stats = fs.statSync(fullPath);
            this.state.fileStructure.set(relPath, {
              type: 'file',
              size: stats.size,
              modified: stats.mtimeMs,
            });
          }
        }
      } catch (error) {
        console.warn(`[v0] Failed to scan ${dir}:`, error);
      }
    };

    scan(this.state.projectRoot);
    this.state.lastUpdated = Date.now();
  }

  /**
   * Record a successful or failed operation
   */
  public recordOperation(
    operation: string,
    success: boolean,
    duration: number,
    resourceUsed: number,
    outcome: string
  ): void {
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
  public recordAnomaly(
    type: string,
    description: string,
    severity: 'low' | 'medium' | 'high',
    context?: Record<string, unknown>
  ): void {
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
  public learnPattern(
    name: string,
    description: string,
    locations: string[],
    relatedPatterns: string[] = []
  ): void {
    const existing = this.state.patterns.get(name);
    if (existing) {
      existing.frequency += 1;
      existing.locations = Array.from(new Set([...existing.locations, ...locations]));
      existing.confidence = Math.min(existing.confidence + 0.05, 1.0);
    } else {
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
  public registerDependency(
    from: string,
    to: string,
    type: 'import' | 'file' | 'package' | 'api',
    strength: number = 1.0
  ): void {
    const existing = this.state.dependencies.find((d) => d.from === from && d.to === to);
    if (existing) {
      existing.strength += strength;
    } else {
      this.state.dependencies.push({ from, to, type, strength });
    }
  }

  /**
   * Record a failure mode and its resolution
   */
  public recordFailureMode(failureType: string, resolution: string): void {
    const existing = this.state.failureModes.get(failureType);
    if (existing) {
      existing.frequency += 1;
    } else {
      this.state.failureModes.set(failureType, {
        frequency: 1,
        resolution,
      });
    }
  }

  /**
   * Get similar past operations
   */
  public getSimilarOperations(operation: string, limit: number = 5): OperationHistory[] {
    return this.state.operationHistory
      .filter((op) => op.operation.includes(operation))
      .slice(-limit)
      .reverse();
  }

  /**
   * Predict operation outcome based on history
   */
  public predictOperationOutcome(
    operation: string
  ): { successProbability: number; avgDuration: number; avgResource: number } {
    const similar = this.state.operationHistory.filter((op) => op.operation === operation);

    if (similar.length === 0) {
      return { successProbability: 0.5, avgDuration: 5000, avgResource: 256 };
    }

    const successful = similar.filter((op) => op.success).length;
    const avgDuration =
      similar.reduce((sum, op) => sum + op.duration, 0) / similar.length;
    const avgResource =
      similar.reduce((sum, op) => sum + op.resourceUsed, 0) / similar.length;

    return {
      successProbability: successful / similar.length,
      avgDuration,
      avgResource,
    };
  }

  /**
   * Get intelligence about a file or directory
   */
  public getFileIntelligence(filePath: string): {
    exists: boolean;
    type?: 'file' | 'dir';
    size?: number;
    lastModified?: number;
    relatedPatterns: ProjectPattern[];
    dependencies: ProjectDependency[];
  } {
    const info = this.state.fileStructure.get(filePath);
    const relatedPatterns = Array.from(this.state.patterns.values()).filter((p) =>
      p.locations.some((loc) => loc.includes(filePath))
    );
    const dependencies = this.state.dependencies.filter(
      (d) => d.from === filePath || d.to === filePath
    );

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
  public getProjectIntelligence(): {
    fileCount: number;
    dirCount: number;
    patternCount: number;
    dependencyCount: number;
    anomalyCount: number;
    successRate: number;
    avgOperationDuration: number;
    lastScanTime: number;
  } {
    const files = Array.from(this.state.fileStructure.values()).filter((f) => f.type === 'file');
    const dirs = Array.from(this.state.fileStructure.values()).filter((f) => f.type === 'dir');

    const successful = this.state.operationHistory.filter((op) => op.success).length;
    const avgDuration =
      this.state.operationHistory.length > 0
        ? this.state.operationHistory.reduce((sum, op) => sum + op.duration, 0) /
          this.state.operationHistory.length
        : 0;

    return {
      fileCount: files.length,
      dirCount: dirs.length,
      patternCount: this.state.patterns.size,
      dependencyCount: this.state.dependencies.length,
      anomalyCount: this.state.anomalies.length,
      successRate:
        this.state.operationHistory.length > 0
          ? successful / this.state.operationHistory.length
          : 0,
      avgOperationDuration: avgDuration,
      lastScanTime: this.state.lastUpdated,
    };
  }

  /**
   * Export full state
   */
  public getState(): ProjectWorldState {
    return this.state;
  }

  /**
   * Start periodic sync to disk
   */
  public startPeriodicSync(intervalMs: number = 30000): void {
    this.updateInterval = setInterval(() => {
      this.saveToDisk();
    }, intervalMs);
  }

  /**
   * Stop periodic sync
   */
  public stopPeriodicSync(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    this.stopPeriodicSync();
    this.saveToDisk();
  }
}
