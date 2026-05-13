/**
 * Execution Stream Panel - Real-time execution visualization
 *
 * This panel shows what's happening during task execution in real-time:
 * - Current phase and progress
 * - Step-by-step execution timeline
 * - Live events and decisions
 * - Recovery attempts
 * - Performance metrics
 */
import * as vscode from 'vscode';
import { ExecutionStreamManager } from '../runtime/executionStreamManager';
/**
 * Options for creating the execution stream panel
 */
export interface ExecutionStreamPanelOptions {
    title?: string;
    position?: vscode.ViewColumn;
    retainContextWhenHidden?: boolean;
}
export declare class ExecutionStreamPanel {
    private context;
    private panel;
    private disposables;
    private streamManager;
    private currentPhase;
    private events;
    private eventUnsubscribe;
    constructor(context: vscode.ExtensionContext, streamManager: ExecutionStreamManager, options?: ExecutionStreamPanelOptions);
    /**
     * Show the panel
     */
    show(): void;
    /**
     * Hide the panel
     */
    hide(): void;
    /**
     * Update panel with event
     */
    private onEvent;
    /**
     * Private: Setup the webview panel
     */
    private setupPanel;
    /**
     * Private: Subscribe to execution events
     */
    private subscribeToEvents;
    /**
     * Private: Update UI with current state
     */
    private updateUI;
    /**
     * Private: Handle messages from webview
     */
    private handleWebviewMessage;
    /**
     * Private: Export events
     */
    private exportEvents;
    /**
     * Private: Get webview HTML content
     */
    private getWebviewContent;
    /**
     * Cleanup on dispose
     */
    dispose(): void;
}
