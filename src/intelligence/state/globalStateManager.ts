import * as fs from 'fs';
import * as path from 'path';

export interface StateSnapshot {
  timestamp: number;
  projectStructure: Record<string, any>;
  dependencies: Record<string, string>;
  lastActions: Array<{
    action: string;
    timestamp: number;
    result: 'success' | 'failure' | 'pending';
  }>;
  buildStatus: 'success' | 'failure' | 'pending' | 'unknown';
  errors: Array<{
    timestamp: number;
    message: string;
    stack?: string;
    context?: Record<string, any>;
  }>;
  executionMetrics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageResponseTime: number;
  };
}

export class GlobalStateManager {
  private state: StateSnapshot;
  private stateHistory: StateSnapshot[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private persistencePath: string;

  constructor(projectRoot: string) {
    this.persistencePath = path.join(projectRoot, '.sinter', 'global-state.json');
    this.state = this.initializeState();
    this.loadStateFromDisk();
  }

  private initializeState(): StateSnapshot {
    return {
      timestamp: Date.now(),
      projectStructure: {},
      dependencies: {},
      lastActions: [],
      buildStatus: 'unknown',
      errors: [],
      executionMetrics: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageResponseTime: 0,
      },
    };
  }

  private loadStateFromDisk(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const data = fs.readFileSync(this.persistencePath, 'utf-8');
        this.state = JSON.parse(data);
      }
    } catch (error) {
      console.error('[Sinter] Failed to load global state:', error);
    }
  }

  public persistToDisk(): void {
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.persistencePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('[Sinter] Failed to persist global state:', error);
    }
  }

  public updateProjectStructure(structure: Record<string, any>): void {
    this.state.projectStructure = structure;
    this.state.timestamp = Date.now();
    this.emit('structure-updated', structure);
    this.persistToDisk();
  }

  public updateDependencies(deps: Record<string, string>): void {
    this.state.dependencies = deps;
    this.state.timestamp = Date.now();
    this.emit('dependencies-updated', deps);
    this.persistToDisk();
  }

  public recordAction(
    action: string,
    result: 'success' | 'failure' | 'pending'
  ): void {
    this.state.lastActions.push({
      action,
      timestamp: Date.now(),
      result,
    });

    // Keep only last 100 actions
    if (this.state.lastActions.length > 100) {
      this.state.lastActions = this.state.lastActions.slice(-100);
    }

    this.emit('action-recorded', { action, result });
    this.persistToDisk();
  }

  public setBuildStatus(status: 'success' | 'failure' | 'pending' | 'unknown'): void {
    this.state.buildStatus = status;
    this.state.timestamp = Date.now();
    this.emit('build-status-changed', status);
    this.persistToDisk();
  }

  public recordError(message: string, stack?: string, context?: Record<string, any>): void {
    this.state.errors.push({
      timestamp: Date.now(),
      message,
      stack,
      context,
    });

    // Keep only last 50 errors
    if (this.state.errors.length > 50) {
      this.state.errors = this.state.errors.slice(-50);
    }

    this.emit('error-recorded', { message, stack, context });
    this.persistToDisk();
  }

  public updateExecutionMetrics(metrics: Partial<StateSnapshot['executionMetrics']>): void {
    this.state.executionMetrics = {
      ...this.state.executionMetrics,
      ...metrics,
    };
    this.state.timestamp = Date.now();
    this.emit('metrics-updated', this.state.executionMetrics);
    this.persistToDisk();
  }

  public getState(): StateSnapshot {
    return { ...this.state };
  }

  public getLastActions(count: number = 10): StateSnapshot['lastActions'] {
    return this.state.lastActions.slice(-count);
  }

  public getRecentErrors(count: number = 10): StateSnapshot['errors'] {
    return this.state.errors.slice(-count);
  }

  public rollback(stepsBack: number = 1): void {
    if (this.stateHistory.length >= stepsBack) {
      this.state = this.stateHistory[this.stateHistory.length - stepsBack];
      this.emit('state-rolled-back', { stepsBack });
      this.persistToDisk();
    }
  }

  public saveSnapshot(): void {
    this.stateHistory.push(JSON.parse(JSON.stringify(this.state)));
    // Keep only last 20 snapshots
    if (this.stateHistory.length > 20) {
      this.stateHistory = this.stateHistory.slice(-20);
    }
  }

  public on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  public off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[Sinter] Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

export default GlobalStateManager;
