/**
 * Execution Stream Manager - Real-time event streaming to UI
 * 
 * Manages the continuous stream of execution events that inform the UI
 * about what the agent is doing in real-time. Handles:
 * - Event emission during execution phases
 * - Timeline tracking for execution visualization
 * - Progress reporting and status updates
 * - UI subscription management
 */

/**
 * Execution event types that can be streamed to UI
 */
export enum ExecutionEventType {
  PHASE_START = 'phase_start',
  PHASE_COMPLETE = 'phase_complete',
  STEP_START = 'step_start',
  STEP_COMPLETE = 'step_complete',
  STEP_ERROR = 'step_error',
  ANALYSIS = 'analysis',
  DECISION = 'decision',
  RECOVERY = 'recovery',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Individual execution event
 */
export interface ExecutionEvent {
  id: string;
  timestamp: number;
  type: ExecutionEventType;
  phase: string;
  stepIndex?: number;
  message: string;
  details?: any;
  status: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Execution timeline - sequence of events for a single execution cycle
 */
export interface ExecutionTimeline {
  cycleId: string;
  startTime: number;
  endTime?: number;
  events: ExecutionEvent[];
  duration?: number;
}

/**
 * Listener callback type
 */
export type EventListener = (event: ExecutionEvent) => void;

export class ExecutionStreamManager {
  private events: ExecutionEvent[] = [];
  private timelines = new Map<string, ExecutionTimeline>();
  private listeners: Set<EventListener> = new Set();
  private currentCycleId: string | null = null;
  private maxHistorySize = 1000;

  constructor() {
    console.log('[ExecutionStreamManager] Initialized');
  }

  /**
   * Emit an execution event to all listeners
   */
  emitEvent(event: ExecutionEvent): void {
    // Add to event history
    this.events.push(event);
    
    // Keep history size bounded
    if (this.events.length > this.maxHistorySize) {
      this.events = this.events.slice(-this.maxHistorySize);
    }

    // Add to current timeline
    if (this.currentCycleId) {
      const timeline = this.timelines.get(this.currentCycleId);
      if (timeline) {
        timeline.events.push(event);
      }
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ExecutionStreamManager] Error in event listener:', error);
      }
    });

    // Log event
    this.logEvent(event);
  }

  /**
   * Subscribe to execution events
   */
  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Start a new execution timeline
   */
  startTimeline(cycleId: string): void {
    this.currentCycleId = cycleId;
    this.timelines.set(cycleId, {
      cycleId,
      startTime: Date.now(),
      events: []
    });
  }

  /**
   * Complete the current timeline
   */
  endTimeline(): void {
    if (this.currentCycleId) {
      const timeline = this.timelines.get(this.currentCycleId);
      if (timeline) {
        timeline.endTime = Date.now();
        timeline.duration = timeline.endTime - timeline.startTime;
      }
      this.currentCycleId = null;
    }
  }

  /**
   * Get timeline for a specific execution cycle
   */
  getTimeline(cycleId: string): ExecutionTimeline | undefined {
    return this.timelines.get(cycleId);
  }

  /**
   * Get all execution timelines
   */
  getAllTimelines(): ExecutionTimeline[] {
    return Array.from(this.timelines.values());
  }

  /**
   * Get execution history (all events)
   */
  getHistory(limit?: number): ExecutionEvent[] {
    if (limit) {
      return this.events.slice(-limit);
    }
    return [...this.events];
  }

  /**
   * Get events for a specific phase
   */
  getPhaseEvents(phase: string): ExecutionEvent[] {
    return this.events.filter(event => event.phase === phase);
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): ExecutionEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.events = [];
    this.timelines.clear();
    this.currentCycleId = null;
  }

  /**
   * Get statistics about execution events
   */
  getStatistics() {
    const stats = {
      totalEvents: this.events.length,
      totalTimelines: this.timelines.size,
      averageTimelineLength: 0,
      eventsByType: {} as Record<ExecutionEventType, number>,
      eventsByPhase: {} as Record<string, number>,
      successCount: 0,
      errorCount: 0,
      averageExecutionTime: 0
    };

    // Count by type and phase
    this.events.forEach(event => {
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      stats.eventsByPhase[event.phase] = (stats.eventsByPhase[event.phase] || 0) + 1;
      
      if (event.status === 'success') stats.successCount++;
      if (event.status === 'error') stats.errorCount++;
    });

    // Calculate averages
    const timelines = Array.from(this.timelines.values());
    if (timelines.length > 0) {
      stats.averageTimelineLength = this.events.length / timelines.length;
      const completedTimelines = timelines.filter(t => t.duration);
      if (completedTimelines.length > 0) {
        stats.averageExecutionTime = 
          completedTimelines.reduce((sum, t) => sum + (t.duration || 0), 0) / 
          completedTimelines.length;
      }
    }

    return stats;
  }

  /**
   * Private: Log event to console
   */
  private logEvent(event: ExecutionEvent): void {
    const timestamp = new Date(event.timestamp).toISOString().split('T')[1];
    const icon = this.getStatusIcon(event.status);
    const type = event.type.padEnd(20);
    const phase = event.phase.padEnd(12);
    
    console.log(
      `[${timestamp}] ${icon} [${type}] [${phase}] ${event.message}`
    );
  }

  /**
   * Private: Get icon for status
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '•';
    }
  }

  /**
   * Export timeline as JSON
   */
  exportTimeline(cycleId: string): string {
    const timeline = this.timelines.get(cycleId);
    if (!timeline) {
      throw new Error(`Timeline ${cycleId} not found`);
    }
    return JSON.stringify(timeline, null, 2);
  }

  /**
   * Export all timelines as JSON
   */
  exportAllTimelines(): string {
    return JSON.stringify(Array.from(this.timelines.values()), null, 2);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalExecutionTime: number;
    averagePhaseTime: Record<string, number>;
    fastestExecution: number;
    slowestExecution: number;
    medianExecutionTime: number;
  } {
    const timelines = Array.from(this.timelines.values())
      .filter(t => t.duration !== undefined)
      .map(t => t.duration!);

    if (timelines.length === 0) {
      return {
        totalExecutionTime: 0,
        averagePhaseTime: {},
        fastestExecution: 0,
        slowestExecution: 0,
        medianExecutionTime: 0
      };
    }

    const phaseTimings: Record<string, number[]> = {};
    this.events.forEach(event => {
      if (!phaseTimings[event.phase]) {
        phaseTimings[event.phase] = [];
      }
    });

    const averagePhaseTime: Record<string, number> = {};
    Object.entries(phaseTimings).forEach(([phase, times]) => {
      averagePhaseTime[phase] = times.length > 0 
        ? times.reduce((a, b) => a + b, 0) / times.length 
        : 0;
    });

    timelines.sort((a, b) => a - b);
    const median = timelines.length % 2 === 0
      ? (timelines[timelines.length / 2 - 1] + timelines[timelines.length / 2]) / 2
      : timelines[Math.floor(timelines.length / 2)];

    return {
      totalExecutionTime: timelines.reduce((a, b) => a + b, 0),
      averagePhaseTime,
      fastestExecution: Math.min(...timelines),
      slowestExecution: Math.max(...timelines),
      medianExecutionTime: median
    };
  }

  /**
   * Cleanup on dispose
   */
  dispose(): void {
    this.listeners.clear();
    this.events = [];
    this.timelines.clear();
    console.log('[ExecutionStreamManager] Disposed');
  }
}

// Global instance
export let globalExecutionStreamManager: ExecutionStreamManager;

/**
 * Initialize global execution stream manager
 */
export function initializeGlobalExecutionStreamManager(): ExecutionStreamManager {
  globalExecutionStreamManager = new ExecutionStreamManager();
  return globalExecutionStreamManager;
}
