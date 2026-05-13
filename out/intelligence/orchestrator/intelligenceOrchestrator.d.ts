import GlobalStateManager from '../state/globalStateManager';
import DeepReasoningEngine from '../reasoning/deepReasoningEngine';
import ToolIntelligence from '../ux/toolIntelligence';
import MemoryGraph from '../knowledge/memoryGraph';
import RiskAssessor from '../optimization/riskAssessor';
export interface IntelligenceOutput {
    recommendedTool: string;
    toolArguments: Record<string, unknown>;
    expectedOutcome: string;
    priority: number;
    reasoning: string;
}
export interface ExecutionPrediction {
    id: string;
    timestamp: number;
    confidence: number;
    toolName: string;
    expectedSuccessRate: number;
    estimatedDuration: number;
}
export interface IntelligenceContext {
    projectRoot: string;
    environment: 'development' | 'staging' | 'production';
    userGoal: string;
    constraints?: Record<string, any>;
}
export interface ExecutionPlan {
    intent: string;
    reasoning: any;
    strategy: string;
    steps: Array<{
        order: number;
        action: string;
        expectedDuration: number;
    }>;
    riskAssessment: any;
    performancePrediction: any;
    estimatedTotalTime: number;
    successProbability: number;
}
export declare class IntelligenceOrchestrator {
    private globalState;
    private deepReasoning;
    private taskEvolution;
    private safetyValidator;
    private validationFramework;
    private bootstrap;
    private contextScoring;
    private toolIntelligence;
    private memoryGraph;
    private codeAnalyzer;
    private performancePredictor;
    private riskAssessor;
    private context;
    private goalDecomposition;
    private prioritization;
    private worldModel;
    constructor(context: IntelligenceContext);
    planExecution(userGoal: string): Promise<ExecutionPlan>;
    executeWithIntelligence(plan: ExecutionPlan): Promise<{
        success: boolean;
        result: any;
        metrics: any;
    }>;
    /**
     * Orchestrate with full autonomy: decompose goals, prioritize, and prepare for autonomous execution
     */
    orchestrateWithAutonomy(userGoal: string): Promise<{
        goalTree: any;
        priorities: any[];
        executionOrder: string[];
        worldModelIntelligence: any;
        metadata: {
            taskId: string;
            autonomyScore: number;
            decompositionDepth: number;
            totalEstimatedEffort: number;
        };
    }>;
    /**
     * Calculate decomposition depth
     */
    private calculateDecompositionDepth;
    /**
     * Runtime integration: Orchestrate task execution with real tool outputs
     * Returns executable intelligence outputs and predictions for the autonomous agent
     */
    orchestrate(taskDescription: string): Promise<{
        outputs: IntelligenceOutput[];
        predictions: ExecutionPrediction[];
        metadata: {
            taskId: string;
            executedAt: number;
            confidence: number;
            systemHealth: number;
        };
    }>;
    /**
     * Generate tool arguments based on task description
     */
    private generateToolArguments;
    getSystemStatus(): {
        allSystems: string[];
        healthStatus: Record<string, string>;
        readiness: number;
    };
    getGlobalState(): GlobalStateManager;
    getDeepReasoning(): DeepReasoningEngine;
    getMemoryGraph(): MemoryGraph;
    getToolIntelligence(): ToolIntelligence;
    getRiskAssessor(): RiskAssessor;
}
export default IntelligenceOrchestrator;
