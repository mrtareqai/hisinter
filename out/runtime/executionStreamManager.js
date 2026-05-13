"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGlobalExecutionStreamManager = exports.globalExecutionStreamManager = exports.ExecutionStreamManager = exports.ExecutionEventType = void 0;
/**
 * Execution event types that can be streamed to UI
 */
var ExecutionEventType;
(function (ExecutionEventType) {
    ExecutionEventType["PHASE_START"] = "phase_start";
    ExecutionEventType["PHASE_COMPLETE"] = "phase_complete";
    ExecutionEventType["STEP_START"] = "step_start";
    ExecutionEventType["STEP_COMPLETE"] = "step_complete";
    ExecutionEventType["STEP_ERROR"] = "step_error";
    ExecutionEventType["ANALYSIS"] = "analysis";
    ExecutionEventType["DECISION"] = "decision";
    ExecutionEventType["RECOVERY"] = "recovery";
    ExecutionEventType["COMPLETE"] = "complete";
    ExecutionEventType["ERROR"] = "error";
})(ExecutionEventType || (exports.ExecutionEventType = ExecutionEventType = {}));
class ExecutionStreamManager {
    events = [];
    timelines = new Map();
    listeners = new Set();
    currentCycleId = null;
    maxHistorySize = 1000;
    constructor() {
        console.log('[ExecutionStreamManager] Initialized');
    }
    /**
     * Emit an execution event to all listeners
     */
    emitEvent(event) {
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
            }
            catch (error) {
                console.error('[ExecutionStreamManager] Error in event listener:', error);
            }
        });
        // Log event
        this.logEvent(event);
    }
    /**
     * Subscribe to execution events
     */
    subscribe(listener) {
        this.listeners.add(listener);
        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }
    /**
     * Start a new execution timeline
     */
    startTimeline(cycleId) {
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
    endTimeline() {
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
    getTimeline(cycleId) {
        return this.timelines.get(cycleId);
    }
    /**
     * Get all execution timelines
     */
    getAllTimelines() {
        return Array.from(this.timelines.values());
    }
    /**
     * Get execution history (all events)
     */
    getHistory(limit) {
        if (limit) {
            return this.events.slice(-limit);
        }
        return [...this.events];
    }
    /**
     * Get events for a specific phase
     */
    getPhaseEvents(phase) {
        return this.events.filter(event => event.phase === phase);
    }
    /**
     * Get recent events
     */
    getRecentEvents(count = 10) {
        return this.events.slice(-count);
    }
    /**
     * Clear all history
     */
    clearHistory() {
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
            eventsByType: {},
            eventsByPhase: {},
            successCount: 0,
            errorCount: 0,
            averageExecutionTime: 0
        };
        // Count by type and phase
        this.events.forEach(event => {
            stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
            stats.eventsByPhase[event.phase] = (stats.eventsByPhase[event.phase] || 0) + 1;
            if (event.status === 'success')
                stats.successCount++;
            if (event.status === 'error')
                stats.errorCount++;
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
    logEvent(event) {
        const timestamp = new Date(event.timestamp).toISOString().split('T')[1];
        const icon = this.getStatusIcon(event.status);
        const type = event.type.padEnd(20);
        const phase = event.phase.padEnd(12);
        console.log(`[${timestamp}] ${icon} [${type}] [${phase}] ${event.message}`);
    }
    /**
     * Private: Get icon for status
     */
    getStatusIcon(status) {
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
    exportTimeline(cycleId) {
        const timeline = this.timelines.get(cycleId);
        if (!timeline) {
            throw new Error(`Timeline ${cycleId} not found`);
        }
        return JSON.stringify(timeline, null, 2);
    }
    /**
     * Export all timelines as JSON
     */
    exportAllTimelines() {
        return JSON.stringify(Array.from(this.timelines.values()), null, 2);
    }
    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const timelines = Array.from(this.timelines.values())
            .filter(t => t.duration !== undefined)
            .map(t => t.duration);
        if (timelines.length === 0) {
            return {
                totalExecutionTime: 0,
                averagePhaseTime: {},
                fastestExecution: 0,
                slowestExecution: 0,
                medianExecutionTime: 0
            };
        }
        const phaseTimings = {};
        this.events.forEach(event => {
            if (!phaseTimings[event.phase]) {
                phaseTimings[event.phase] = [];
            }
        });
        const averagePhaseTime = {};
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
    dispose() {
        this.listeners.clear();
        this.events = [];
        this.timelines.clear();
        console.log('[ExecutionStreamManager] Disposed');
    }
}
exports.ExecutionStreamManager = ExecutionStreamManager;
/**
 * Initialize global execution stream manager
 */
function initializeGlobalExecutionStreamManager() {
    exports.globalExecutionStreamManager = new ExecutionStreamManager();
    return exports.globalExecutionStreamManager;
}
exports.initializeGlobalExecutionStreamManager = initializeGlobalExecutionStreamManager;
//# sourceMappingURL=executionStreamManager.js.map