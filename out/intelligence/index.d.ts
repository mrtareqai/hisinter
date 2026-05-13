export { GlobalStateManager } from './state/globalStateManager';
export type { StateSnapshot } from './state/globalStateManager';
export { DeepReasoningEngine } from './reasoning/deepReasoningEngine';
export type { ReasoningChain, ReasoningStep } from './reasoning/deepReasoningEngine';
export { TaskEvolutionSystem } from './reasoning/taskEvolutionSystem';
export type { TaskEvolution, TaskMetrics } from './reasoning/taskEvolutionSystem';
export { SafetyValidator } from './validation/safetyValidator';
export type { ValidationResult, OperationConstraint } from './validation/safetyValidator';
export { ValidationFramework } from './validation/validationFramework';
export type { ValidationReport, ValidationExpectation } from './validation/validationFramework';
export { BootstrapIntelligence } from './ux/bootstrapIntelligence';
export type { BootstrapConfig, BootstrapPlan } from './ux/bootstrapIntelligence';
export { ContextScoringSystem } from './ux/contextScoringSystem';
export type { ContextElement, RelevanceScore } from './ux/contextScoringSystem';
export { ToolIntelligence } from './ux/toolIntelligence';
export type { Tool, ToolScore, ToolChain } from './ux/toolIntelligence';
export { MemoryGraph } from './knowledge/memoryGraph';
export type { MemoryNode, MemoryEdge } from './knowledge/memoryGraph';
export { CodePatternAnalyzer } from './knowledge/codePatternAnalyzer';
export type { CodePattern, PatternMatch } from './knowledge/codePatternAnalyzer';
export { PerformancePredictor } from './optimization/performancePredictor';
export type { ExecutionPrediction, PerformanceMetrics } from './optimization/performancePredictor';
export { RiskAssessor } from './optimization/riskAssessor';
export type { RiskAssessment, RiskFactor } from './optimization/riskAssessor';
export { ExecutionOptimizer } from './optimization/executionOptimizer';
export type { ExecutionPath, OptimizationResult } from './optimization/executionOptimizer';
export { IntelligenceOrchestrator } from './orchestrator/intelligenceOrchestrator';
export type { ExecutionPlan, IntelligenceContext } from './orchestrator/intelligenceOrchestrator';
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
export declare function createIntelligenceSystem(projectRoot: string): {
    orchestrator: (context: any) => any;
};
