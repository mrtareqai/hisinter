import * as vscode from 'vscode';
import { UserIntent } from '../../types/agent';
export declare class IntentEngine {
    private context;
    private framework;
    private projectStyle;
    constructor(context: vscode.ExtensionContext);
    analyzeIntent(userMessage: string): Promise<UserIntent>;
    private recognizeIntentType;
    private calculateConfidence;
    private extractParameters;
    private identifyMissingInfo;
    private generateContextualQuestions;
    private paraphraseIntent;
    private buildIntentContext;
    private loadKnowledge;
}
export declare const globalIntentEngine: IntentEngine;
