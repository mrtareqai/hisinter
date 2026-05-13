import * as vscode from 'vscode';
import { OllamaModel } from '../ai/ollamaClient';
import { ModelRegistry } from '../ai/modelRegistry';
export declare class ModelManagerProvider implements vscode.TreeDataProvider<ModelItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<ModelItem>;
    private client;
    private registry;
    constructor(ollamaUrl: string, registry?: ModelRegistry);
    refresh(): void;
    getTreeItem(element: ModelItem): vscode.TreeItem;
    getChildren(): Promise<ModelItem[]>;
    pullModel(): Promise<void>;
    deleteModel(item: ModelItem): Promise<void>;
    setActiveModel(item: ModelItem): Promise<void>;
}
declare class ModelItem extends vscode.TreeItem {
    readonly model: OllamaModel;
    readonly isActive: boolean;
    readonly providerLabel: string;
    readonly isOnline: boolean;
    constructor(model: OllamaModel, isActive: boolean, providerLabel: string, isOnline?: boolean);
}
export {};
