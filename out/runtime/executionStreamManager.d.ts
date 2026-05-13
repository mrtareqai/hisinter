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
export declare enum ExecutionEventType {
    PHASE_START = "phase_start",
    PHASE_COMPLETE = "phase_complete",
    STEP_START = "step_start",
    STEP_COMPLETE = "step_complete",
    STEP_ERROR = "step_error",
    ANALYSIS = "analysis",
    DECISION = "decision",
    RECOVERY = "recovery",
    COMPLETE = "complete",
    ERROR = "error"
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
export declare class ExecutionStreamManager {
    private events;
    private timelines;
    private listeners;
    private currentCycleId;
    private maxHistorySize;
    constructor();
    /**
     * Emit an execution event to all listeners
     */
    emitEvent(event: ExecutionEvent): void;
    /**
     * Subscribe to execution events
     */
    subscribe(listener: EventListener): () => void;
    /**
     * Start a new execution timeline
     */
    startTimeline(cycleId: string): void;
    /**
     * Complete the current timeline
     */
    endTimeline(): void;
    /**
     * Get timeline for a specific execution cycle
     */
    getTimeline(cycleId: string): ExecutionTimeline | undefined;
    /**
     * Get all execution timelines
     */
    getAllTimelines(): ExecutionTimeline[];
    /**
     * Get execution history (all events)
     */
    getHistory(limit?: number): ExecutionEvent[];
    /**
     * Get events for a specific phase
     */
    getPhaseEvents(phase: string): ExecutionEvent[];
    /**
     * Get recent events
     */
    getRecentEvents(count?: number): ExecutionEvent[];
    /**
     * Clear all history
     */
    clearHistory(): void;
    /**
     * Get statistics about execution events
     */
    getStatistics(): {
        totalEvents: number;
        totalTimelines: number;
        averageTimelineLength: number;
        eventsByType: Record<ExecutionEventType, number>;
        eventsByPhase: Record<string, number>;
        successCount: number;
        errorCount: number;
        averageExecutionTime: number;
    };
    /**
     * Private: Log event to console
     */
    private logEvent;
    /**
     * Private: Get icon for status
     */
    private getStatusIcon;
    /**
     * Export timeline as JSON
     */
    exportTimeline(cycleId: string): string;
    /**
     * Export all timelines as JSON
     */
    exportAllTimelines(): string;
    /**
     * Get performance summary
     */
    getPerformanceSummary(): {
        totalExecutionTime: number;
        averagePhaseTime: Record<string, number>;
        fastestExecution: number;
        slowestExecution: number;
        medianExecutionTime: number;
    };
    /**
     * Cleanup on dispose
     */
    dispose(): void;
}
export declare let globalExecutionStreamManager: ExecutionStreamManager;
/**
 * Initialize global execution stream manager
 */
export declare function initializeGlobalExecutionStreamManager(): ExecutionStreamManager;
