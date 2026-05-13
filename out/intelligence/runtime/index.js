"use strict";
/**
 * Sinter AI 5.0 Runtime Module
 * Complete execution-feedback-learning pipeline for autonomous agent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeFactory = exports.initializeRuntimeSystem = exports.AutonomousRuntimeAgent = exports.VSCodeAPIAdapter = exports.TerminalExecutor = exports.FilesystemMonitor = exports.LearningEngine = exports.ValidationOrchestrator = exports.FeedbackCollector = exports.ExecutionAdapter = void 0;
var executionAdapter_1 = require("./executionAdapter");
Object.defineProperty(exports, "ExecutionAdapter", { enumerable: true, get: function () { return executionAdapter_1.ExecutionAdapter; } });
var feedbackCollector_1 = require("./feedbackCollector");
Object.defineProperty(exports, "FeedbackCollector", { enumerable: true, get: function () { return feedbackCollector_1.FeedbackCollector; } });
var validationOrchestrator_1 = require("./validationOrchestrator");
Object.defineProperty(exports, "ValidationOrchestrator", { enumerable: true, get: function () { return validationOrchestrator_1.ValidationOrchestrator; } });
var learningEngine_1 = require("./learningEngine");
Object.defineProperty(exports, "LearningEngine", { enumerable: true, get: function () { return learningEngine_1.LearningEngine; } });
var environmentAdapters_1 = require("./environmentAdapters");
Object.defineProperty(exports, "FilesystemMonitor", { enumerable: true, get: function () { return environmentAdapters_1.FilesystemMonitor; } });
Object.defineProperty(exports, "TerminalExecutor", { enumerable: true, get: function () { return environmentAdapters_1.TerminalExecutor; } });
Object.defineProperty(exports, "VSCodeAPIAdapter", { enumerable: true, get: function () { return environmentAdapters_1.VSCodeAPIAdapter; } });
var autonomousRuntimeAgent_1 = require("./autonomousRuntimeAgent");
Object.defineProperty(exports, "AutonomousRuntimeAgent", { enumerable: true, get: function () { return autonomousRuntimeAgent_1.AutonomousRuntimeAgent; } });
// Main entry point for runtime integration
const executionAdapter_2 = require("./executionAdapter");
const feedbackCollector_2 = require("./feedbackCollector");
const validationOrchestrator_2 = require("./validationOrchestrator");
const learningEngine_2 = require("./learningEngine");
const environmentAdapters_2 = require("./environmentAdapters");
const autonomousRuntimeAgent_2 = require("./autonomousRuntimeAgent");
/**
 * Initialize complete Sinter AI 5.0 runtime system
 */
function initializeRuntimeSystem(toolRegistry, intelligenceOrchestrator, workspacePath = process.cwd()) {
    console.log('[v0] Initializing Sinter AI 5.0 Runtime System');
    const agent = new autonomousRuntimeAgent_2.AutonomousRuntimeAgent(toolRegistry, intelligenceOrchestrator, workspacePath);
    console.log('[v0] Runtime system initialized and ready for autonomous execution');
    return agent;
}
exports.initializeRuntimeSystem = initializeRuntimeSystem;
/**
 * Export factory for creating individual runtime components
 */
exports.RuntimeFactory = {
    createExecutionAdapter: (toolRegistry) => new executionAdapter_2.ExecutionAdapter(toolRegistry),
    createFeedbackCollector: (path) => new feedbackCollector_2.FeedbackCollector(path || './intelligence-feedback'),
    createValidationOrchestrator: () => new validationOrchestrator_2.ValidationOrchestrator(),
    createLearningEngine: (path) => new learningEngine_2.LearningEngine(path || './intelligence-learning'),
    createFilesystemMonitor: () => new environmentAdapters_2.FilesystemMonitor(),
    createTerminalExecutor: () => new environmentAdapters_2.TerminalExecutor(),
    createVSCodeAdapter: () => new environmentAdapters_2.VSCodeAPIAdapter(),
    createAutonomousAgent: (toolRegistry, orchestrator, workspacePath) => new autonomousRuntimeAgent_2.AutonomousRuntimeAgent(toolRegistry, orchestrator, workspacePath || process.cwd()),
};
//# sourceMappingURL=index.js.map