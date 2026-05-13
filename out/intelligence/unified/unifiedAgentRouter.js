"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedAgentRouter = void 0;
const unifiedIDEBrain_1 = __importDefault(require("./unifiedIDEBrain"));
const unifiedExecutionPipeline_1 = __importDefault(require("./unifiedExecutionPipeline"));
const intelligentQuestioningSystem_1 = __importDefault(require("./intelligentQuestioningSystem"));
const projectGenerationEngine_1 = __importDefault(require("./projectGenerationEngine"));
const unifiedConsoleInterface_1 = __importDefault(require("./unifiedConsoleInterface"));
const projectWorldModel_1 = __importDefault(require("../autonomy/projectWorldModel"));
/**
 * UnifiedAgentRouter - Factory and singleton for unified IDE agent
 * Provides single entry point to all unified systems
 */
class UnifiedAgentRouter {
    static instance = null;
    brain;
    pipeline;
    questioningSystem;
    projectGenerator;
    console;
    worldModel;
    projectRoot;
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        // Initialize systems in order
        console.log('[v0] Initializing UnifiedAgentRouter...');
        // Core world model
        this.worldModel = new projectWorldModel_1.default(projectRoot);
        this.worldModel.scanProjectStructure();
        this.worldModel.startPeriodicSync();
        // Brain (orchestrator)
        this.brain = new unifiedIDEBrain_1.default(projectRoot);
        // Questioning system
        this.questioningSystem = new intelligentQuestioningSystem_1.default(this.worldModel);
        // Project generator
        this.projectGenerator = new projectGenerationEngine_1.default(projectRoot);
        // Pipeline
        this.pipeline = new unifiedExecutionPipeline_1.default(this.brain, this.questioningSystem, this.projectGenerator);
        // Console interface
        this.console = new unifiedConsoleInterface_1.default(this.brain, this.pipeline, this.questioningSystem);
        console.log('[v0] UnifiedAgentRouter initialized successfully');
    }
    /**
     * Get singleton instance
     */
    static getInstance(projectRoot) {
        if (!UnifiedAgentRouter.instance) {
            UnifiedAgentRouter.instance = new UnifiedAgentRouter(projectRoot);
        }
        return UnifiedAgentRouter.instance;
    }
    /**
     * Reset singleton (for testing)
     */
    static reset() {
        UnifiedAgentRouter.instance = null;
    }
    /**
     * Get the unified console interface
     */
    getConsole() {
        return this.console;
    }
    /**
     * Get the brain
     */
    getBrain() {
        return this.brain;
    }
    /**
     * Get the pipeline
     */
    getPipeline() {
        return this.pipeline;
    }
    /**
     * Get the questioning system
     */
    getQuestioningSystem() {
        return this.questioningSystem;
    }
    /**
     * Get the project generator
     */
    getProjectGenerator() {
        return this.projectGenerator;
    }
    /**
     * Get the world model
     */
    getWorldModel() {
        return this.worldModel;
    }
    /**
     * Process user input through unified console
     */
    async processUserInput(input) {
        return this.console.processUserInput(input);
    }
    /**
     * Answer a question
     */
    async answerQuestion(questionContent, answer) {
        return this.console.answerQuestion(questionContent, answer);
    }
    /**
     * Get current state
     */
    getState() {
        return {
            console: this.console.getState(),
            brain: this.brain.getState(),
            worldModel: this.worldModel.getProjectIntelligence(),
        };
    }
    /**
     * Get analytics
     */
    getAnalytics() {
        return this.brain.getAnalytics();
    }
    /**
     * Set autonomy level (0.0 - 1.0)
     */
    setAutonomyLevel(level) {
        this.brain.setAutonomyLevel(level);
        this.console.setAutonomyLevel(level);
    }
    /**
     * Get console history
     */
    getConsoleHistory() {
        return this.console.getHistory();
    }
    /**
     * Get console output as string
     */
    getConsoleOutput() {
        return this.console.toString();
    }
    /**
     * Get all active contexts
     */
    getActiveContexts() {
        return this.pipeline.getActiveContexts();
    }
    /**
     * Subscribe to console messages
     */
    onConsoleMessage(callback) {
        return this.console.onMessage(callback);
    }
    /**
     * Subscribe to state changes
     */
    onStateChange(callback) {
        return this.console.onStateChange(callback);
    }
    /**
     * Shutdown all systems
     */
    async shutdown() {
        console.log('[v0] Shutting down UnifiedAgentRouter...');
        await this.brain.shutdown();
        UnifiedAgentRouter.instance = null;
    }
}
exports.UnifiedAgentRouter = UnifiedAgentRouter;
exports.default = UnifiedAgentRouter;
//# sourceMappingURL=unifiedAgentRouter.js.map