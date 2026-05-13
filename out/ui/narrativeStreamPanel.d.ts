import * as vscode from 'vscode';
import { NarrativeEvent } from '../types/agent';
export declare class NarrativeStreamPanel {
    private context;
    private panel;
    private events;
    private currentProgress;
    constructor(context: vscode.ExtensionContext);
    show(context: vscode.ExtensionContext): Promise<void>;
    addEvent(event: NarrativeEvent): void;
    setProgress(progress: number): void;
    addInfo(message: string): void;
    addWarning(message: string): void;
    addError(message: string): void;
    addSuccess(message: string): void;
    clear(): void;
    private handleMessage;
    private exportEvents;
    private generateId;
    private getHtml;
}
export declare const createNarrativeStreamPanel: (context: vscode.ExtensionContext) => NarrativeStreamPanel;
