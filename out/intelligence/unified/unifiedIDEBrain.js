"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedIDEBrain = void 0;
const intelligenceOrchestrator_1 = __importDefault(require("../orchestrator/intelligenceOrchestrator"));
const autonomousRuntimeAgent_1 = __importDefault(require("../runtime/autonomousRuntimeAgent"));
const autonomyController_1 = __importDefault(require("../autonomy/autonomyController"));
const goalDecompositionEngine_1 = __importDefault(require("../autonomy/goalDecompositionEngine"));
const projectWorldModel_1 = __importDefault(require("../autonomy/projectWorldModel"));
const learningEngine_1 = __importDefault(require("../runtime/learningEngine"));
const analyticsEngine_1 = __importDefault(require("../runtime/analyticsEngine"));
/**
 * UnifiedIDEBrain - Central orchestration hub for Sinter AI 5.0
 * Integrates all 16 intelligence systems + autonomy layer
 * Routes execution through intelligent decision pipeline
 */
class UnifiedIDEBrain {
    orchestrator;
    runtimeAgent;
    autonomyController;
    goalDecomposition;
    worldModel;
    learningEngine;
    analyticsEngine;
    state = {
        currentGoal: null,
        executingTasks: [],
        queuedTasks: [],
        systemHealth: 1.0,
        autonomyLevel: 0.85,
        lastUpdate: Date.now(),
    };
    executionQueue = [];
    decisionHistory = [];
    constructor(projectRoot) {
        // Initialize all core systems
        this.orchestrator = new intelligenceOrchestrator_1.default({
            projectRoot,
            environment: 'production',
        });
        this.runtimeAgent = new autonomousRuntimeAgent_1.default(projectRoot);
        this.autonomyController = new autonomyController_1.default();
        this.goalDecomposition = new goalDecompositionEngine_1.default();
        this.worldModel = new projectWorldModel_1.default(projectRoot);
        this.learningEngine = new learningEngine_1.default();
        this.analyticsEngine = new analyticsEngine_1.default(projectRoot);
        this.initialize();
    }
    initialize() {
        console.log('[v0] UnifiedIDEBrain initializing...');
        this.worldModel.scanProjectStructure();
        this.worldModel.startPeriodicSync();
    }
    /**
     * Process user goal through unified pipeline
     * Routes through decomposition, prioritization, autonomy check, execution
     */
    async processGoal(goal) {
        const requestId = `goal-${Date.now()}`;
        console.log('[v0] Processing goal:', goal);
        // Step 1: Decompose goal
        const goalTree = this.goalDecomposition.decompose(goal);
        // Step 2: Get orchestrator intelligence
        const orchestration = await this.orchestrator.orchestrateWithAutonomy(goal);
        // Step 3: Get world model context
        const worldContext = this.worldModel.getProjectIntelligence();
        // Step 4: Run autonomy controller
        const decision = await this.autonomyController.decide(requestId, {
            type: 'goal',
            goal,
            decompositionDepth: orchestration.metadata.decompositionDepth,
            executionOrder: orchestration.executionOrder,
            estimatedEffort: orchestration.metadata.totalEstimatedEffort,
            confidence: orchestration.metadata.confidence,
            riskLevel: worldContext.riskPatterns.length > 0 ? 'high' : 'low',
            requiresUserConfirmation: goal.includes('delete') || goal.includes('deploy'),
        }, {
            autonomyThreshold: this.state.autonomyLevel,
            confirmationThreshold: 0.7,
            blockThreshold: 0.3,
        });
        console.log('[v0] Decision:', decision.decision, 'Confidence:', decision.confidence);
        // Step 5: Execute based on decision
        let result = undefined;
        let questionsForUser = [];
        if (decision.decision === 'execute') {
            result = await this.runtimeAgent.executeAutonomously(goal, orchestration.outputs, orchestration.predictions);
            // Learn from execution
            this.learningEngine.processExecutionFeedback({
                id: requestId,
                executionId: result.executionId,
                success: result.success,
                duration: result.duration,
                output: result.output,
                errors: result.errors,
                confidence: decision.confidence,
            });
        }
        else if (decision.decision === 'ask_user') {
            questionsForUser = decision.requiredInfo || [
                'Please clarify the scope of this task',
                'Should I proceed with this operation?',
            ];
        }
        else if (decision.decision === 'decompose') {
            // Decompose and queue sub-tasks
            for (const subGoal of Array.from(goalTree.allGoals.values()).slice(1)) {
                this.executionQueue.push({
                    id: `subtask-${Date.now()}`,
                    type: 'task',
                    content: subGoal.description,
                    priority: 'medium',
                });
            }
        }
        else if (decision.decision === 'block') {
            console.warn('[v0] Execution blocked for safety reasons');
        }
        // Store decision
        this.decisionHistory.push(decision);
        this.state.lastUpdate = Date.now();
        return {
            decision,
            result,
            questionsForUser,
        };
    }
    /**
     * Answer user question and continue execution
     */
    async answerQuestion(requestId, answer) {
        // Find original decision
        const originalDecision = this.decisionHistory.find((d) => d.id === requestId);
        if (!originalDecision) {
            throw new Error(`Decision ${requestId} not found`);
        }
        console.log('[v0] User answered:', answer);
        // Re-evaluate with user input
        const newDecision = await this.autonomyController.decide(requestId, {
            type: 'task',
            goal: originalDecision.reasoning,
            confidence: Math.min(1, originalDecision.confidence + 0.15),
            userInput: answer,
        }, { autonomyThreshold: this.state.autonomyLevel });
        let result = undefined;
        if (newDecision.decision === 'execute') {
            result = await this.runtimeAgent.executeAutonomously(answer, [], []);
        }
        return { decision: newDecision, result };
    }
    /**
     * Queue a task for execution
     */
    queueTask(task) {
        this.executionQueue.push(task);
        console.log('[v0] Task queued:', task.id);
    }
    /**
     * Process next task in queue
     */
    async processNextTask() {
        if (this.executionQueue.length === 0) {
            return null;
        }
        const task = this.executionQueue.shift();
        if (!task)
            return null;
        const result = await this.processGoal(task.content);
        return result.decision;
    }
    /**
     * Get current brain state
     */
    getState() {
        return {
            ...this.state,
            executingTasks: this.runtimeAgent.getExecutingTaskIds(),
            queuedTasks: this.executionQueue.map((t) => t.id),
            systemHealth: this.orchestrator.getSystemStatus().readiness,
        };
    }
    /**
     * Adjust autonomy level
     */
    setAutonomyLevel(level) {
        this.state.autonomyLevel = Math.max(0.1, Math.min(1, level));
        console.log('[v0] Autonomy level set to:', this.state.autonomyLevel);
    }
    /**
     * Get analytics and insights
     */
    getAnalytics() {
        return this.analyticsEngine.getComprehensiveReport();
    }
    /**
     * Shutdown gracefully
     */
    async shutdown() {
        console.log('[v0] UnifiedIDEBrain shutting down...');
        await this.worldModel.persistState();
        await this.learningEngine.persistModels();
        console.log('[v0] Shutdown complete');
    }
}
exports.UnifiedIDEBrain = UnifiedIDEBrain;
exports.default = UnifiedIDEBrain;
//# sourceMappingURL=unifiedIDEBrain.js.map