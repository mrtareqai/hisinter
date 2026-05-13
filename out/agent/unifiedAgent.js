"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnifiedAgent = exports.UnifiedAgent = void 0;
const intentEngine_1 = require("./intents/intentEngine");
const unifiedPlanner_1 = require("./planning/unifiedPlanner");
const executionEngine_1 = require("./execution/executionEngine");
const contextBrain_1 = require("./context/contextBrain");
const errorIntelligence_1 = require("./recovery/errorIntelligence");
const narrativeGenerator_1 = require("./narrative/narrativeGenerator");
const silentMemoryCore_1 = require("../memory/silentMemoryCore");
class UnifiedAgent {
    context;
    workspaceRoot;
    intentEngine;
    planner;
    executionEngine;
    contextBrain;
    errorIntelligence;
    narrativeGenerator;
    memoryCore;
    state = {
        isActive: false,
        currentTask: null,
        currentStep: 0,
        progress: 0,
        narrativeEvents: [],
        errors: [],
        memoryState: {},
        contextState: null,
    };
    eventListeners = new Map();
    constructor(context, workspaceRoot = process.cwd()) {
        this.context = context;
        this.workspaceRoot = workspaceRoot;
        this.intentEngine = new intentEngine_1.IntentEngine(context);
        this.planner = new unifiedPlanner_1.UnifiedPlanner();
        this.executionEngine = new executionEngine_1.ExecutionEngine(workspaceRoot);
        this.contextBrain = new contextBrain_1.ContextBrain(workspaceRoot);
        this.errorIntelligence = new errorIntelligence_1.ErrorIntelligence();
        this.narrativeGenerator = new narrativeGenerator_1.NarrativeGenerator();
        this.memoryCore = new silentMemoryCore_1.SilentMemoryCore();
    }
    async handleUserRequest(userMessage) {
        // Step 1: Understand intent
        const intent = await this.intentEngine.analyzeIntent(userMessage);
        // Ask clarifying questions if needed
        if (intent.requiredInfo.length > 0) {
            return this.generateInitialResponse(intent);
        }
        // Step 2: Create execution plan
        const plan = await this.planner.createPlan(intent);
        this.state.currentTask = plan;
        // Step 3: Analyze context
        const context = await this.contextBrain.analyzeProject();
        this.state.contextState = context;
        // Step 4: Get relevant memories
        const relevantMemories = this.memoryCore.recallSimilar(userMessage, 3);
        // Step 5: Execute plan
        this.state.isActive = true;
        const executionResults = await this.executionEngine.executePlan(plan, (result) => {
            this.handleExecutionStep(result, plan);
        });
        // Step 6: Handle any errors
        const errors = this.executionEngine.getErrors();
        for (const error of errors) {
            const step = plan.steps.find((s) => s.id === error.id);
            if (step) {
                const analysis = this.errorIntelligence.analyzeError(error, step);
                if (analysis.canAutoRecover) {
                    const fix = this.errorIntelligence.suggestAutoFix(error);
                    if (fix) {
                        // Store the fix in memory
                        this.memoryCore.learnErrorFix(error.type, fix, step.description);
                    }
                }
            }
        }
        // Step 7: Learn from execution
        this.learnFromExecution(executionResults, intent);
        // Step 8: Generate success message
        const successMessage = this.generateSuccessMessage(intent, executionResults);
        this.state.isActive = false;
        return successMessage;
    }
    generateInitialResponse(intent) {
        const questions = intent.suggestedQuestions.slice(0, 2);
        const message = `I understand you want to ${intent.understood}.\n\n`;
        if (questions.length > 0) {
            return message + 'A couple of quick questions:\n' + questions.map((q) => `• ${q}`).join('\n');
        }
        return message + 'Let me get started...';
    }
    handleExecutionStep(result, plan) {
        // Find the step
        const step = plan.steps.find((s) => s.id === result.stepId);
        if (!step)
            return;
        // Update progress
        this.state.currentStep = step.order;
        this.state.progress = (step.order / plan.steps.length) * 100;
        // Generate narrative
        const narrativeEvent = this.narrativeGenerator.generateNarrativeEvent(step, step.order, plan.steps.length);
        this.state.narrativeEvents.push(narrativeEvent);
        // Emit event for UI
        this.emit('step-complete', narrativeEvent);
    }
    learnFromExecution(results, intent) {
        const allSuccess = results.every((r) => r.success);
        if (allSuccess) {
            // Learn the successful approach
            this.memoryCore.learnSolution(intent.raw, JSON.stringify(results), intent.context?.currentFramework);
            // Learn any patterns discovered
            if (this.state.contextState) {
                this.memoryCore.learn('project_pattern', JSON.stringify(this.state.contextState?.recentPatterns), { project: this.state.contextState?.name });
            }
        }
    }
    generateSuccessMessage(intent, results) {
        const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
        const narrative = this.narrativeGenerator.generateSuccessNarrative(results.length, totalTime);
        const recommendation = this.narrativeGenerator.generateRecommendation('project_created');
        return `${narrative}\n\n${recommendation}`;
    }
    async provideFollowUpQuestion(previousIntent) {
        const memories = this.memoryCore.recall('task_solution', undefined, 3);
        if (memories.length > 0) {
            return 'Would you like me to apply a pattern I learned from a similar project?';
        }
        return null;
    }
    getAgentState() {
        return { ...this.state };
    }
    getMemoryStats() {
        return this.memoryCore.getMemoryStats();
    }
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    emit(event, data) {
        const callbacks = this.eventListeners.get(event) || [];
        callbacks.forEach((cb) => cb(data));
    }
    async shutdown() {
        this.memoryCore.destroy();
    }
}
exports.UnifiedAgent = UnifiedAgent;
const createUnifiedAgent = (context, workspaceRoot) => {
    return new UnifiedAgent(context, workspaceRoot);
};
exports.createUnifiedAgent = createUnifiedAgent;
//# sourceMappingURL=unifiedAgent.js.map