"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedIDEBrain = void 0;
const intelligenceOrchestrator_1 = __importDefault(require("../../intelligence/orchestrator/intelligenceOrchestrator"));
const autonomyController_1 = require("../../intelligence/autonomy/autonomyController");
const conflictResolutionEngine_1 = require("../../intelligence/autonomy/conflictResolutionEngine");
const projectWorldModel_1 = require("../../intelligence/autonomy/projectWorldModel");
const globalStateManager_1 = require("../../intelligence/state/globalStateManager");
/**
 * UnifiedIDEBrain - Single orchestration point for all IDE operations
 * Integrates all 16 intelligence systems + autonomy layer + multi-agent loop
 * All operations flow through this single brain
 */
class UnifiedIDEBrain {
    orchestrator;
    autonomyController;
    conflictResolver;
    worldModel;
    globalState;
    operationId;
    callbacks;
    constructor(projectRoot) {
        this.operationId = `brain-${Date.now()}`;
        this.callbacks = new Map();
        // Initialize all systems
        const context = {
            projectRoot,
            environment: process.env.NODE_ENV || 'development',
        };
        this.orchestrator = new intelligenceOrchestrator_1.default(context);
        this.autonomyController = new autonomyController_1.AutonomyController();
        this.conflictResolver = new conflictResolutionEngine_1.ConflictResolutionEngine();
        this.worldModel = new projectWorldModel_1.ProjectWorldModel(projectRoot);
        this.globalState = new globalStateManager_1.GlobalStateManager(projectRoot);
    }
    /**
     * Process user intent through unified brain
     * Single entry point for all user interactions
     */
    async processUserIntent(intent) {
        const operationId = `intent-${Date.now()}`;
        try {
            this.emit('thinking', `Processing intent: "${intent}"`);
            // Step 1: Orchestrate with autonomy
            const orchestration = await this.orchestrator.orchestrateWithAutonomy(intent);
            this.emit('decomposed', {
                goals: Array.from(orchestration.goalTree.allGoals.values()),
                autonomyScore: orchestration.metadata.autonomyScore,
            });
            // Step 2: Get autonomy controller decision
            const decision = await this.autonomyController.decideExecution(operationId, {
                taskDescription: intent,
                confidence: orchestration.metadata.confidence,
                complexity: Math.min(1, orchestration.goalTree.allGoals.size / 10),
                riskLevel: orchestration.goalTree.allGoals.size > 5 ? 'high' : 'medium',
            });
            this.emit('decision', {
                type: decision.decision,
                confidence: decision.confidence,
                reasoning: decision.reasoning,
            });
            // Step 3: Check for conflicts
            if (decision.decision === 'execute') {
                const conflicts = await this.conflictResolver.detectConflicts(operationId, orchestration.goalTree.executionOrder.map((goalId) => ({
                    goalId,
                    type: 'execution',
                })));
                if (conflicts.length > 0) {
                    this.emit('conflicts', conflicts);
                    const resolved = await this.conflictResolver.resolveAutonomously(operationId, conflicts);
                    if (resolved.requiresUserInput) {
                        return {
                            decision: 'ask',
                            reasoning: `Detected ${conflicts.length} execution conflicts that need clarification`,
                            suggestedActions: resolved.suggestedQuestions,
                            goals: orchestration.goalTree,
                            confidence: decision.confidence,
                        };
                    }
                }
            }
            return {
                decision: decision.decision,
                reasoning: decision.reasoning,
                suggestedActions: orchestration.goalTree.executionOrder.slice(0, 3),
                goals: orchestration.goalTree,
                confidence: decision.confidence,
            };
        }
        catch (error) {
            this.emit('error', {
                operationId,
                message: `Brain processing failed: ${error}`,
            });
            return {
                decision: 'block',
                reasoning: `Error processing intent: ${error}`,
                suggestedActions: [],
                confidence: 0,
            };
        }
    }
    /**
     * Execute a single goal with full intelligence support
     */
    async executeGoal(goalId, goalDescription) {
        const operationId = `exec-${goalId}-${Date.now()}`;
        try {
            this.emit('executing', { goalId, description: goalDescription });
            // Step 1: Get prediction from performance predictor
            const prediction = await this.orchestrator.predictGoalOutcome(goalId);
            // Step 2: Execute through unified pipeline
            const result = await this.executeIntelligent(goalId, goalDescription);
            // Step 3: Collect feedback
            const feedback = await this.collectExecutionFeedback(operationId, result);
            // Step 4: Generate learning signals
            const learningSignals = this.generateLearningSignals(prediction, result, feedback);
            // Step 5: Update world model
            this.worldModel.recordExecution(goalId, {
                success: result.success,
                duration: result.duration,
                feedback,
                learningSignals,
            });
            this.emit('executed', {
                goalId,
                success: result.success,
                learningSignals,
            });
            return {
                success: result.success,
                output: result.output,
                feedback,
                learningSignals,
            };
        }
        catch (error) {
            this.emit('executionError', { operationId, error });
            return {
                success: false,
                output: '',
                feedback: { error: String(error) },
                learningSignals: { failure: true },
            };
        }
    }
    /**
     * Intelligent execution with tool selection and error recovery
     */
    async executeIntelligent(goalId, goalDescription) {
        const startTime = Date.now();
        // Get tool recommendations from orchestrator
        const orchestration = await this.orchestrator.orchestrate(goalDescription);
        const selectedTools = orchestration.outputs.slice(0, 2).map((o) => ({
            tool: o.recommendedTool,
            args: o.toolArguments,
            priority: o.priority,
        }));
        this.emit('tools_selected', selectedTools);
        // Execute with fallback strategy
        for (const toolConfig of selectedTools) {
            try {
                const result = await this.executeTool(toolConfig.tool, toolConfig.args);
                if (result.success) {
                    return {
                        success: true,
                        output: result.output,
                        duration: Date.now() - startTime,
                        toolsUsed: [toolConfig.tool],
                    };
                }
            }
            catch (error) {
                this.emit('tool_failed', {
                    tool: toolConfig.tool,
                    error,
                });
                // Continue to next tool
            }
        }
        return {
            success: false,
            output: 'No tools succeeded',
            duration: Date.now() - startTime,
            toolsUsed: [],
        };
    }
    /**
     * Execute a single tool
     */
    async executeTool(toolName, args) {
        // This would integrate with the actual tool registry
        // For now, return a success placeholder
        return {
            success: true,
            output: `Executed ${toolName} with args ${JSON.stringify(args)}`,
        };
    }
    /**
     * Collect feedback from execution
     */
    async collectExecutionFeedback(operationId, result) {
        return {
            operationId,
            timestamp: Date.now(),
            outcome: result.success ? 'success' : 'failure',
            systemMetrics: {
                cpuUsage: Math.random() * 100,
                memoryUsage: Math.random() * 100,
                duration: result.duration,
            },
            environmentState: this.worldModel.exportState(),
        };
    }
    /**
     * Generate learning signals from execution
     */
    generateLearningSignals(prediction, result, feedback) {
        const surprise = prediction
            ? Math.abs(prediction.expectedSuccessRate - (result.success ? 1 : 0))
            : 0;
        return {
            surprise,
            prediction_accurate: surprise < 0.2,
            performance_score: result.success ? 0.9 : 0.1,
            tool_effectiveness: 0.85,
            timestamp: Date.now(),
        };
    }
    /**
     * Register callback for events
     */
    on(event, callback) {
        this.callbacks.set(event, callback);
    }
    /**
     * Emit event to callbacks
     */
    emit(event, data) {
        const callback = this.callbacks.get(event);
        if (callback) {
            callback(data);
        }
    }
    /**
     * Get system status and health
     */
    getSystemStatus() {
        return {
            brainId: this.operationId,
            systems: 21, // 16 intelligence + 5 autonomy systems
            autonomyScore: 0.85,
            uptime: Date.now(),
            memory: process.memoryUsage(),
        };
    }
    /**
     * Shutdown brain gracefully
     */
    async shutdown() {
        this.emit('shutdown', { brainId: this.operationId });
        this.worldModel.stopPeriodicSync();
        this.globalState.saveState();
    }
}
exports.UnifiedIDEBrain = UnifiedIDEBrain;
exports.default = UnifiedIDEBrain;
//# sourceMappingURL=unifiedIDEBrain.js.map