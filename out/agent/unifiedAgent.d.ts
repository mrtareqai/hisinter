import * as vscode from 'vscode';
import { UserIntent, AgentState } from '../types/agent';
export declare class UnifiedAgent {
    private context;
    private workspaceRoot;
    private intentEngine;
    private planner;
    private executionEngine;
    private contextBrain;
    private errorIntelligence;
    private narrativeGenerator;
    private memoryCore;
    private state;
    private eventListeners;
    constructor(context: vscode.ExtensionContext, workspaceRoot?: string);
    handleUserRequest(userMessage: string): Promise<string>;
    private generateInitialResponse;
    private handleExecutionStep;
    private learnFromExecution;
    private generateSuccessMessage;
    provideFollowUpQuestion(previousIntent: UserIntent): Promise<string | null>;
    getAgentState(): AgentState;
    getMemoryStats(): import("../memory/silentMemoryCore").MemoryStats;
    on(event: string, callback: Function): void;
    private emit;
    shutdown(): Promise<void>;
}
export declare const createUnifiedAgent: (context: vscode.ExtensionContext, workspaceRoot?: string) => UnifiedAgent;
