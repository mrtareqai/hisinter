import IntelligenceOrchestrator from '../../intelligence/orchestrator/intelligenceOrchestrator';
import { ProjectWorldModel } from '../../intelligence/autonomy/projectWorldModel';
/**
 * IntelligenceHubIntegration
 * Bridges all intelligence systems into unified communication layer
 * Manages inter-system dependencies and data flow
 */
export declare class IntelligenceHubIntegration {
    private orchestrator;
    private goalDecomposition;
    private prioritization;
    private autonomyController;
    private conflictResolver;
    private worldModel;
    private integrationId;
    constructor(orchestrator: IntelligenceOrchestrator, worldModel: ProjectWorldModel);
    /**
     * Full intelligent pipeline: analyze → decompose → prioritize → decide
     */
    fullIntelligencePipeline(userGoal: string): Promise<{
        analysis: any;
        decomposition: any;
        priorities: any[];
        decision: any;
        nextAction: string;
    }>;
    /**
     * Validate goal execution path
     */
    validateExecutionPath(goalTree: any): Promise<{
        valid: boolean;
        conflicts: any[];
        warnings: string[];
        optimizedOrder: string[];
    }>;
    /**
     * Get intelligent suggestions for next action
     */
    suggestNextActions(currentGoal: string): Promise<string[]>;
    /**
     * Check if autonomous execution is safe for given goal
     */
    isAutonomousSafe(goalDescription: string): Promise<{
        safe: boolean;
        confidence: number;
        risks: string[];
    }>;
    /**
     * Learn from execution result
     */
    learnFromExecution(goalId: string, result: {
        success: boolean;
        duration: number;
        toolsUsed: string[];
        feedback: any;
    }): Promise<void>;
    /**
     * Export full hub status
     */
    exportHubStatus(): {
        integrationId: string;
        systems: {
            orchestrator: any;
            goalDecomposition: any;
            prioritization: any;
            autonomyController: any;
            conflictResolver: any;
            worldModel: any;
        };
    };
}
export default IntelligenceHubIntegration;
