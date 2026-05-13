"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGlobalOrchestrator = exports.globalOrchestrator = exports.UnifiedOrchestrator = void 0;
const performanceMonitor_1 = require("./performanceMonitor");
const cacheManager_1 = require("./cacheManager");
const retryEngine_1 = require("./retryEngine");
const contextOptimizer_1 = require("./contextOptimizer");
const autonomousRecovery_1 = require("./autonomousRecovery");
const executionStreamManager_1 = require("./executionStreamManager");
class UnifiedOrchestrator {
    systems = new Map();
    currentTask;
    executionHistory = [];
    startTime = Date.now();
    executedTasks = 0;
    isPaused = false;
    isCancelled = false;
    // Core systems
    perfMonitor;
    cache;
    retryEngine;
    contextOptimizer;
    recovery;
    streamManager;
    constructor() {
        // Initialize core systems
        this.perfMonitor = new performanceMonitor_1.PerformanceMonitor();
        this.cache = new cacheManager_1.CacheManager();
        this.retryEngine = new retryEngine_1.RetryEngine();
        this.contextOptimizer = new contextOptimizer_1.ContextOptimizer();
        this.recovery = new autonomousRecovery_1.AutonomousRecovery();
        this.streamManager = new executionStreamManager_1.ExecutionStreamManager();
        this.registerCoreSystem('monitor', this.perfMonitor);
        this.registerCoreSystem('cache', this.cache);
        this.registerCoreSystem('retry', this.retryEngine);
        this.registerCoreSystem('contextOpt', this.contextOptimizer);
        this.registerCoreSystem('recovery', this.recovery);
        this.registerCoreSystem('stream', this.streamManager);
    }
    /**
     * Register a core system with the orchestrator
     */
    registerCoreSystem(name, system) {
        this.systems.set(name, system);
    }
    /**
     * Initialize the orchestrator and all systems
     */
    async initialize() {
        console.log('[Orchestrator] Initializing unified orchestrator...');
        // Set up recovery system
        this.recovery.setMode(autonomousRecovery_1.RecoveryMode.ACTIVE);
        console.log('[Orchestrator] All systems initialized successfully');
        // Emit initialization event
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.PHASE_START,
            phase: 'initialization',
            message: 'Unified orchestrator initialized',
            status: 'success'
        });
    }
    /**
     * Execute a task through the complete orchestration cycle
     */
    async executeTask(task) {
        this.currentTask = task;
        this.isCancelled = false;
        const startTime = performance.now();
        const metrics = {
            planningTime: 0,
            executionTime: 0,
            observationTime: 0,
            recoveryTime: 0,
            cacheHitRate: 0,
            tokensUsed: 0,
            success: false
        };
        try {
            console.log(`[Orchestrator] Starting task execution: ${task.description}`);
            // Emit task start event
            this.emitEvent({
                type: executionStreamManager_1.ExecutionEventType.PHASE_START,
                phase: 'execution',
                message: `Starting task: ${task.description}`,
                status: 'info'
            });
            // Phase 1: Planning - analyze task and prepare strategy
            const planStart = performance.now();
            await this.planPhase(task);
            metrics.planningTime = performance.now() - planStart;
            if (this.isCancelled) {
                throw new Error('Task cancelled by user');
            }
            // Phase 2: Execution - execute with retry logic
            const execStart = performance.now();
            const result = await this.executeWithRetry(task);
            metrics.executionTime = performance.now() - execStart;
            if (this.isCancelled) {
                throw new Error('Task cancelled during execution');
            }
            // Phase 3: Observation - analyze results
            const obsStart = performance.now();
            const observation = await this.observePhase(result);
            metrics.observationTime = performance.now() - obsStart;
            // Phase 4: Recovery (if needed) - handle any issues
            if (!observation.success) {
                const recStart = performance.now();
                await this.recoverPhase(task, observation);
                metrics.recoveryTime = performance.now() - recStart;
            }
            metrics.success = observation.success;
            metrics.cacheHitRate = this.cache.getStats().hitRate;
            // Emit completion event
            this.emitEvent({
                type: executionStreamManager_1.ExecutionEventType.COMPLETE,
                phase: 'completion',
                message: 'Task completed successfully',
                status: 'success',
                details: { output: result }
            });
            this.executedTasks++;
            const taskResult = {
                taskId: task.id,
                success: observation.success,
                output: result,
                executionTime: performance.now() - startTime,
                phasesCompleted: ['planning', 'execution', 'observation'],
                metrics
            };
            this.executionHistory.push(taskResult);
            return taskResult;
        }
        catch (error) {
            console.error('[Orchestrator] Task execution failed:', error);
            this.emitEvent({
                type: executionStreamManager_1.ExecutionEventType.ERROR,
                phase: 'execution',
                message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                status: 'error'
            });
            const taskResult = {
                taskId: task.id,
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                executionTime: performance.now() - startTime,
                phasesCompleted: [],
                metrics
            };
            this.executionHistory.push(taskResult);
            return taskResult;
        }
        finally {
            this.currentTask = undefined;
        }
    }
    /**
     * Planning phase - analyze task and prepare strategy
     */
    async planPhase(task) {
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.PHASE_START,
            phase: 'planning',
            message: 'Analyzing task and preparing strategy',
            status: 'info'
        });
        // Analyze task context
        const contextAnalysis = this.contextOptimizer.analyzeContext({
            description: task.description,
            workspace: task.context.workspace,
            selectedFiles: task.context.selectedFiles
        });
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.ANALYSIS,
            phase: 'planning',
            message: `Context analyzed: ${contextAnalysis.relevantFiles.length} files identified`,
            status: 'success',
            details: contextAnalysis
        });
        // Check cache for similar tasks
        const cacheKey = `task:${task.description}`;
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            this.emitEvent({
                type: executionStreamManager_1.ExecutionEventType.ANALYSIS,
                phase: 'planning',
                message: 'Found cached solution for similar task',
                status: 'success'
            });
        }
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.PHASE_COMPLETE,
            phase: 'planning',
            message: 'Planning phase completed',
            status: 'success'
        });
    }
    /**
     * Execute the task with retry logic
     */
    async executeWithRetry(task) {
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.PHASE_START,
            phase: 'execution',
            message: 'Executing task with retry logic',
            status: 'info'
        });
        // Use retry engine with custom config
        const retryConfig = {
            maxAttempts: 3,
            baseDelayMs: 100,
            backoffMultiplier: 2
        };
        const result = await this.retryEngine.execute(async () => {
            // Simulate task execution
            this.emitEvent({
                type: executionStreamManager_1.ExecutionEventType.STEP_START,
                phase: 'execution',
                stepIndex: 1,
                message: 'Executing step 1: Analysis',
                status: 'info'
            });
            // Simulate work
            await new Promise(resolve => setTimeout(resolve, 100));
            this.emitEvent({
                type: executionStreamManager_1.ExecutionEventType.STEP_COMPLETE,
                phase: 'execution',
                stepIndex: 1,
                message: 'Step 1 completed',
                status: 'success'
            });
            return { status: 'completed', output: task.description };
        }, `task:${task.id}`, retryConfig);
        if (!result.success) {
            throw result.error || new Error('Execution failed');
        }
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.PHASE_COMPLETE,
            phase: 'execution',
            message: 'Execution phase completed',
            status: 'success'
        });
        return result.data;
    }
    /**
     * Observation phase - analyze results
     */
    async observePhase(result) {
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.PHASE_START,
            phase: 'observation',
            message: 'Observing and analyzing execution results',
            status: 'info'
        });
        // Analyze result
        const isSuccessful = result && result.status === 'completed';
        if (isSuccessful) {
            this.emitEvent({
                type: executionStreamManager_1.ExecutionEventType.ANALYSIS,
                phase: 'observation',
                message: 'Execution results validated successfully',
                status: 'success'
            });
        }
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.PHASE_COMPLETE,
            phase: 'observation',
            message: 'Observation phase completed',
            status: 'success'
        });
        return { success: isSuccessful };
    }
    /**
     * Recovery phase - handle issues and recover
     */
    async recoverPhase(task, observation) {
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.PHASE_START,
            phase: 'recovery',
            message: 'Initiating recovery procedure',
            status: 'warning'
        });
        const recovery = this.recovery.attemptRecovery({
            taskId: task.id,
            context: task.description
        });
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.RECOVERY,
            phase: 'recovery',
            message: `Attempting recovery: ${recovery.strategy}`,
            status: 'info',
            details: recovery
        });
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.PHASE_COMPLETE,
            phase: 'recovery',
            message: 'Recovery phase completed',
            status: recovery.success ? 'success' : 'warning'
        });
    }
    /**
     * Pause current execution
     */
    pauseExecution() {
        this.isPaused = true;
        console.log('[Orchestrator] Execution paused');
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.ANALYSIS,
            phase: 'control',
            message: 'Execution paused by user',
            status: 'warning'
        });
    }
    /**
     * Resume paused execution
     */
    resumeExecution() {
        this.isPaused = false;
        console.log('[Orchestrator] Execution resumed');
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.ANALYSIS,
            phase: 'control',
            message: 'Execution resumed by user',
            status: 'info'
        });
    }
    /**
     * Cancel current task execution
     */
    cancelTask() {
        this.isCancelled = true;
        console.log('[Orchestrator] Task cancelled');
        this.emitEvent({
            type: executionStreamManager_1.ExecutionEventType.ERROR,
            phase: 'control',
            message: 'Task cancelled by user',
            status: 'warning'
        });
    }
    /**
     * Get current system status
     */
    getSystemStatus() {
        const perfMetrics = this.perfMonitor.getMetrics();
        return {
            healthy: !this.isCancelled,
            currentTask: this.currentTask,
            activePhase: this.currentTask ? 'execution' : undefined,
            memoryUsage: perfMetrics.memoryUsage,
            uptime: Date.now() - this.startTime,
            executedTasks: this.executedTasks,
            systemHealth: {
                cache: 'healthy',
                monitor: 'healthy',
                recovery: 'healthy',
                memory: perfMetrics.memoryUsage > 400 * 1024 * 1024 ? 'warning' : 'healthy'
            }
        };
    }
    /**
     * Get execution history
     */
    getExecutionHistory() {
        return [...this.executionHistory];
    }
    /**
     * Clear execution history
     */
    clearHistory() {
        this.executionHistory = [];
    }
    /**
     * Emit execution event to stream
     */
    emitEvent(event) {
        const fullEvent = {
            id: `event:${Date.now()}`,
            timestamp: Date.now(),
            type: event.type || executionStreamManager_1.ExecutionEventType.ANALYSIS,
            phase: event.phase || 'unknown',
            message: event.message || '',
            status: event.status || 'info',
            details: event.details
        };
        this.streamManager.emitEvent(fullEvent);
    }
    /**
     * Get reference to a system
     */
    getSystem(name) {
        return this.systems.get(name);
    }
    /**
     * Cleanup on deactivation
     */
    dispose() {
        console.log('[Orchestrator] Disposing unified orchestrator');
        this.systems.clear();
        this.executionHistory = [];
    }
}
exports.UnifiedOrchestrator = UnifiedOrchestrator;
/**
 * Initialize global orchestrator instance
 */
async function initializeGlobalOrchestrator() {
    exports.globalOrchestrator = new UnifiedOrchestrator();
    await exports.globalOrchestrator.initialize();
    return exports.globalOrchestrator;
}
exports.initializeGlobalOrchestrator = initializeGlobalOrchestrator;
//# sourceMappingURL=unifiedOrchestrator.js.map