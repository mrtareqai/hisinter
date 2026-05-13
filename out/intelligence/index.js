"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntelligenceSystem = exports.IntelligenceOrchestrator = exports.ExecutionOptimizer = exports.RiskAssessor = exports.PerformancePredictor = exports.CodePatternAnalyzer = exports.MemoryGraph = exports.ToolIntelligence = exports.ContextScoringSystem = exports.BootstrapIntelligence = exports.ValidationFramework = exports.SafetyValidator = exports.TaskEvolutionSystem = exports.DeepReasoningEngine = exports.GlobalStateManager = void 0;
// Export all intelligence systems
var globalStateManager_1 = require("./state/globalStateManager");
Object.defineProperty(exports, "GlobalStateManager", { enumerable: true, get: function () { return globalStateManager_1.GlobalStateManager; } });
var deepReasoningEngine_1 = require("./reasoning/deepReasoningEngine");
Object.defineProperty(exports, "DeepReasoningEngine", { enumerable: true, get: function () { return deepReasoningEngine_1.DeepReasoningEngine; } });
var taskEvolutionSystem_1 = require("./reasoning/taskEvolutionSystem");
Object.defineProperty(exports, "TaskEvolutionSystem", { enumerable: true, get: function () { return taskEvolutionSystem_1.TaskEvolutionSystem; } });
var safetyValidator_1 = require("./validation/safetyValidator");
Object.defineProperty(exports, "SafetyValidator", { enumerable: true, get: function () { return safetyValidator_1.SafetyValidator; } });
var validationFramework_1 = require("./validation/validationFramework");
Object.defineProperty(exports, "ValidationFramework", { enumerable: true, get: function () { return validationFramework_1.ValidationFramework; } });
var bootstrapIntelligence_1 = require("./ux/bootstrapIntelligence");
Object.defineProperty(exports, "BootstrapIntelligence", { enumerable: true, get: function () { return bootstrapIntelligence_1.BootstrapIntelligence; } });
var contextScoringSystem_1 = require("./ux/contextScoringSystem");
Object.defineProperty(exports, "ContextScoringSystem", { enumerable: true, get: function () { return contextScoringSystem_1.ContextScoringSystem; } });
var toolIntelligence_1 = require("./ux/toolIntelligence");
Object.defineProperty(exports, "ToolIntelligence", { enumerable: true, get: function () { return toolIntelligence_1.ToolIntelligence; } });
var memoryGraph_1 = require("./knowledge/memoryGraph");
Object.defineProperty(exports, "MemoryGraph", { enumerable: true, get: function () { return memoryGraph_1.MemoryGraph; } });
var codePatternAnalyzer_1 = require("./knowledge/codePatternAnalyzer");
Object.defineProperty(exports, "CodePatternAnalyzer", { enumerable: true, get: function () { return codePatternAnalyzer_1.CodePatternAnalyzer; } });
var performancePredictor_1 = require("./optimization/performancePredictor");
Object.defineProperty(exports, "PerformancePredictor", { enumerable: true, get: function () { return performancePredictor_1.PerformancePredictor; } });
var riskAssessor_1 = require("./optimization/riskAssessor");
Object.defineProperty(exports, "RiskAssessor", { enumerable: true, get: function () { return riskAssessor_1.RiskAssessor; } });
var executionOptimizer_1 = require("./optimization/executionOptimizer");
Object.defineProperty(exports, "ExecutionOptimizer", { enumerable: true, get: function () { return executionOptimizer_1.ExecutionOptimizer; } });
var intelligenceOrchestrator_1 = require("./orchestrator/intelligenceOrchestrator");
Object.defineProperty(exports, "IntelligenceOrchestrator", { enumerable: true, get: function () { return intelligenceOrchestrator_1.IntelligenceOrchestrator; } });
/**
 * Sinter AI 5.0 Intelligence System
 *
 * 16 core intelligence systems for autonomous software engineering:
 *
 * CORE REASONING (1-5):
 * 1. Deep Reasoning Engine - Multi-step logical inference with chain-of-thought
 * 2. Global State Manager - Unified system state with persistence
 * 3. Task Evolution System - Adaptive execution with complexity analysis
 * 4. Safety Validator - Pre-execution constraint validation
 * 5. Validation Framework - Post-execution result validation
 *
 * USER EXPERIENCE (6-10):
 * 6. Bootstrap Intelligence - Smart project initialization
 * 7. Minimal Questions Engine - Context-aware questioning (in development)
 * 8. Context Scoring System - Relevance-based information ranking
 * 9. Tool Intelligence - Smart tool selection and chaining
 * 10. Memory Graph - Knowledge representation with relationships
 *
 * ANALYSIS & OPTIMIZATION (11-16):
 * 11. Decision Tree Builder - Pattern learning (in development)
 * 12. Code Pattern Analyzer - Code quality and pattern detection
 * 13. Dependency Resolver - Dependency management (in development)
 * 14. Performance Predictor - Execution time and success prediction
 * 15. Risk Assessor - Risk identification and mitigation
 * 16. Execution Optimizer - Path optimization for efficiency
 *
 * ORCHESTRATION:
 * IntelligenceOrchestrator - Unified command center for all systems
 */
function createIntelligenceSystem(projectRoot) {
    return {
        orchestrator: (context) => {
            const { IntelligenceOrchestrator } = require('./orchestrator/intelligenceOrchestrator');
            return new IntelligenceOrchestrator({
                projectRoot,
                environment: 'development',
                ...context,
            });
        },
    };
}
exports.createIntelligenceSystem = createIntelligenceSystem;
//# sourceMappingURL=index.js.map