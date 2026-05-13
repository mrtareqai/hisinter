import UnifiedIDEBrain from './unifiedIDEBrain';
import UnifiedExecutionPipeline from './unifiedExecutionPipeline';
import IntelligentQuestioningSystem from './intelligentQuestioningSystem';
export interface ConsoleMessage {
    id: string;
    timestamp: number;
    type: 'user' | 'agent' | 'question' | 'status' | 'error' | 'success';
    content: string;
    metadata?: Record<string, unknown>;
}
export interface ConsoleState {
    isProcessing: boolean;
    currentTask: string | null;
    history: ConsoleMessage[];
    autonomyLevel: number;
    systemHealth: number;
}
/**
 * UnifiedConsoleInterface - Single interface for all agent interactions
 * Replaces multi-panel chat/analytics/execution with unified experience
 */
export declare class UnifiedConsoleInterface {
    private brain;
    private pipeline;
    private questioningSystem;
    private state;
    private messageCallbacks;
    private stateCallbacks;
    constructor(brain: UnifiedIDEBrain, pipeline: UnifiedExecutionPipeline, questioningSystem: IntelligentQuestioningSystem);
    /**
     * Process user input through unified console
     */
    processUserInput(input: string): Promise<void>;
    /**
     * Answer a question from the agent
     */
    answerQuestion(questionContent: string, answer: string): Promise<void>;
    /**
     * Parse request type from user input
     */
    private parseRequestType;
    /**
     * Parse priority from user input
     */
    private parsePriority;
    /**
     * Add message to console history
     */
    private addMessage;
    /**
     * Update console state
     */
    private setState;
    /**
     * Subscribe to new messages
     */
    onMessage(callback: (msg: ConsoleMessage) => void): () => void;
    /**
     * Subscribe to state changes
     */
    onStateChange(callback: (state: ConsoleState) => void): () => void;
    /**
     * Get console history
     */
    getHistory(): ConsoleMessage[];
    /**
     * Get current state
     */
    getState(): ConsoleState;
    /**
     * Clear history
     */
    clearHistory(): void;
    /**
     * Set autonomy level
     */
    setAutonomyLevel(level: number): void;
    /**
     * Get analytics
     */
    getAnalytics(): any;
    /**
     * Format console output as string
     */
    toString(): string;
}
export default UnifiedConsoleInterface;
