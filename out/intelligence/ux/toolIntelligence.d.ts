export interface Tool {
    id: string;
    name: string;
    capabilities: string[];
    successRate: number;
    averageExecutionTime: number;
    costFactor: number;
}
export interface ToolScore {
    toolId: string;
    score: number;
    reasons: string[];
    recommendation: 'primary' | 'secondary' | 'fallback' | 'not-recommended';
}
export interface ToolChain {
    tools: string[];
    executionOrder: string[];
    fallbackChain: string[];
    estimatedCost: number;
    estimatedSuccessRate: number;
}
export declare class ToolIntelligence {
    private tools;
    private executionHistory;
    private toolCombinationCache;
    constructor();
    private initializeDefaultTools;
    selectOptimalTool(task: string, requiredCapabilities: string[]): ToolScore[];
    private computeToolScore;
    private getRecommendation;
    private getScoreReasons;
    buildToolChain(tasks: Array<{
        task: string;
        capabilities: string[];
    }>): ToolChain;
    private buildFallbackChain;
    recordExecution(toolId: string, success: boolean, duration: number): void;
    private getRecentSuccessRate;
    addTool(tool: Tool): void;
    getTool(id: string): Tool | undefined;
    getAllTools(): Tool[];
    getExecutionMetrics(): {
        totalExecutions: number;
        successRate: number;
        averageTime: number;
        mostUsedTool: string;
    };
}
export default ToolIntelligence;
