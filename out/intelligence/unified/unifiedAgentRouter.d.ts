import UnifiedIDEBrain from './unifiedIDEBrain';
import UnifiedExecutionPipeline from './unifiedExecutionPipeline';
import IntelligentQuestioningSystem from './intelligentQuestioningSystem';
import ProjectGenerationEngine from './projectGenerationEngine';
import UnifiedConsoleInterface from './unifiedConsoleInterface';
import ProjectWorldModel from '../autonomy/projectWorldModel';
/**
 * UnifiedAgentRouter - Factory and singleton for unified IDE agent
 * Provides single entry point to all unified systems
 */
export declare class UnifiedAgentRouter {
    private static instance;
    private brain;
    private pipeline;
    private questioningSystem;
    private projectGenerator;
    private console;
    private worldModel;
    private projectRoot;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(projectRoot: string): UnifiedAgentRouter;
    /**
     * Reset singleton (for testing)
     */
    static reset(): void;
    /**
     * Get the unified console interface
     */
    getConsole(): UnifiedConsoleInterface;
    /**
     * Get the brain
     */
    getBrain(): UnifiedIDEBrain;
    /**
     * Get the pipeline
     */
    getPipeline(): UnifiedExecutionPipeline;
    /**
     * Get the questioning system
     */
    getQuestioningSystem(): IntelligentQuestioningSystem;
    /**
     * Get the project generator
     */
    getProjectGenerator(): ProjectGenerationEngine;
    /**
     * Get the world model
     */
    getWorldModel(): ProjectWorldModel;
    /**
     * Process user input through unified console
     */
    processUserInput(input: string): Promise<void>;
    /**
     * Answer a question
     */
    answerQuestion(questionContent: string, answer: string): Promise<void>;
    /**
     * Get current state
     */
    getState(): {
        console: import("./unifiedConsoleInterface").ConsoleState;
        brain: import("./unifiedIDEBrain").BrainState;
        worldModel: {
            fileCount: number;
            dirCount: number;
            patternCount: number;
            dependencyCount: number;
            anomalyCount: number;
            successRate: number;
            avgOperationDuration: number;
            lastScanTime: number;
        };
    };
    /**
     * Get analytics
     */
    getAnalytics(): any;
    /**
     * Set autonomy level (0.0 - 1.0)
     */
    setAutonomyLevel(level: number): void;
    /**
     * Get console history
     */
    getConsoleHistory(): import("./unifiedConsoleInterface").ConsoleMessage[];
    /**
     * Get console output as string
     */
    getConsoleOutput(): string;
    /**
     * Get all active contexts
     */
    getActiveContexts(): import("./unifiedExecutionPipeline").PipelineContext[];
    /**
     * Subscribe to console messages
     */
    onConsoleMessage(callback: (msg: any) => void): () => void;
    /**
     * Subscribe to state changes
     */
    onStateChange(callback: (state: any) => void): () => void;
    /**
     * Shutdown all systems
     */
    shutdown(): Promise<void>;
}
export default UnifiedAgentRouter;
