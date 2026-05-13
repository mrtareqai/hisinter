/**
 * Unified Agent Orchestrator - Central coordination point for all Sinter AI systems
 * Manages execution flow, state, recovery, and integrates all subsystems
 *
 * This is the master system that coordinates:
 * - Execution lifecycle and state management
 * - System initialization and lifecycle
 * - Task execution with integrated recovery
 * - Event streaming to UI
 * - Cross-system communication
 */
/**
 * Task definition for orchestrator
 */
export interface Task {
    id: string;
    description: string;
    context: {
        workspace?: string;
        selectedFiles?: string[];
        userPreferences?: Record<string, any>;
    };
    priority?: 'low' | 'normal' | 'high';
    timestamp: number;
}
/**
 * Task result returned after execution
 */
export interface TaskResult {
    taskId: string;
    success: boolean;
    output?: any;
    error?: Error;
    executionTime: number;
    phasesCompleted: string[];
    metrics: ExecutionMetrics;
}
/**
 * Execution metrics collected during task execution
 */
export interface ExecutionMetrics {
    planningTime: number;
    executionTime: number;
    observationTime: number;
    recoveryTime: number;
    cacheHitRate: number;
    tokensUsed: number;
    success: boolean;
}
/**
 * System status snapshot
 */
export interface SystemStatus {
    healthy: boolean;
    currentTask?: Task;
    activePhase?: string;
    memoryUsage: number;
    uptime: number;
    executedTasks: number;
    systemHealth: {
        cache: 'healthy' | 'warning' | 'error';
        monitor: 'healthy' | 'warning' | 'error';
        recovery: 'healthy' | 'warning' | 'error';
        memory: 'healthy' | 'warning' | 'error';
    };
}
export declare class UnifiedOrchestrator {
    private systems;
    private currentTask?;
    private executionHistory;
    private startTime;
    private executedTasks;
    private isPaused;
    private isCancelled;
    private perfMonitor;
    private cache;
    private retryEngine;
    private contextOptimizer;
    private recovery;
    private streamManager;
    constructor();
    /**
     * Register a core system with the orchestrator
     */
    private registerCoreSystem;
    /**
     * Initialize the orchestrator and all systems
     */
    initialize(): Promise<void>;
    /**
     * Execute a task through the complete orchestration cycle
     */
    executeTask(task: Task): Promise<TaskResult>;
    /**
     * Planning phase - analyze task and prepare strategy
     */
    private planPhase;
    /**
     * Execute the task with retry logic
     */
    private executeWithRetry;
    /**
     * Observation phase - analyze results
     */
    private observePhase;
    /**
     * Recovery phase - handle issues and recover
     */
    private recoverPhase;
    /**
     * Pause current execution
     */
    pauseExecution(): void;
    /**
     * Resume paused execution
     */
    resumeExecution(): void;
    /**
     * Cancel current task execution
     */
    cancelTask(): void;
    /**
     * Get current system status
     */
    getSystemStatus(): SystemStatus;
    /**
     * Get execution history
     */
    getExecutionHistory(): TaskResult[];
    /**
     * Clear execution history
     */
    clearHistory(): void;
    /**
     * Emit execution event to stream
     */
    private emitEvent;
    /**
     * Get reference to a system
     */
    getSystem(name: string): any;
    /**
     * Cleanup on deactivation
     */
    dispose(): void;
}
export declare let globalOrchestrator: UnifiedOrchestrator;
/**
 * Initialize global orchestrator instance
 */
export declare function initializeGlobalOrchestrator(): Promise<UnifiedOrchestrator>;
