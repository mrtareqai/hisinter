// ═══════════════════════════════════════════════════════════════
// Sinter AI — Model Manager (v2 — Multi-Provider)
// List models from Ollama + OpenAI-compatible providers
// Pull, delete, switch models with provider labels
// ═══════════════════════════════════════════════════════════════

import * as vscode from 'vscode';
import { OllamaClient, OllamaModel } from '../ai/ollamaClient';
import { ModelRegistry } from '../ai/modelRegistry';

export class ModelManagerProvider implements vscode.TreeDataProvider<ModelItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ModelItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private client: OllamaClient;
    private registry: ModelRegistry;

    constructor(ollamaUrl: string, registry?: ModelRegistry) {
        this.client = new OllamaClient(ollamaUrl);
        this.registry = registry || new ModelRegistry();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: ModelItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<ModelItem[]> {
        try {
            const activeModel = vscode.workspace.getConfiguration('sinter').get<string>('activeModel', 'deepseek-coder:6.7b');
            const items: ModelItem[] = [];

            // Discover from all providers via registry
            try {
                const discovered = await this.registry.discoverAll();
                for (const m of discovered) {
                    const provider = this.registry.getProvider(m.provider);
                    const providerLabel = provider ? provider.name : m.provider;
                    items.push(new ModelItem(
                        { name: m.name, size: m.size || 0, digest: '', modified_at: '' },
                        m.name === activeModel,
                        providerLabel,
                        m.isOnline
                    ));
                }
            } catch {
                // Fallback to direct Ollama
                const models = await this.client.listModels();
                for (const m of models) {
                    items.push(new ModelItem(m, m.name === activeModel, 'Ollama'));
                }
            }

            if (items.length === 0) {
                return [new ModelItem(
                    { name: 'No models found', size: 0, digest: '', modified_at: '' },
                    false, 'N/A'
                )];
            }
            return items;
        } catch {
            return [new ModelItem({
                name: '⚠️ Ollama not running',
                size: 0, digest: '', modified_at: ''
            }, false, '')];
        }
    }

    async pullModel(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Model name to pull (e.g., phi3:mini, mistral, qwen2.5-coder:7b)',
            placeHolder: 'phi3:mini',
        });
        if (!name) { return; }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Pulling ${name}...`,
            cancellable: false,
        }, async (progress) => {
            try {
                for await (const update of this.client.pullModel(name)) {
                    if (update.total && update.completed) {
                        const pct = Math.round((update.completed / update.total) * 100);
                        progress.report({ message: `${pct}% — ${update.status}`, increment: 1 });
                    } else {
                        progress.report({ message: update.status });
                    }
                }
                vscode.window.showInformationMessage(`✅ Model ${name} pulled successfully!`);
                this.refresh();
            } catch (e) {
                vscode.window.showErrorMessage(`❌ Failed to pull ${name}: ${(e as Error).message}`);
            }
        });
    }

    async deleteModel(item: ModelItem): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            `Delete model "${item.model.name}"?`, { modal: true }, 'Delete'
        );
        if (confirm !== 'Delete') { return; }

        try {
            await this.client.deleteModel(item.model.name);
            vscode.window.showInformationMessage(`🗑️ Model ${item.model.name} deleted.`);
            this.refresh();
        } catch (e) {
            vscode.window.showErrorMessage(`Failed: ${(e as Error).message}`);
        }
    }

    async setActiveModel(item: ModelItem): Promise<void> {
        await vscode.workspace.getConfiguration('sinter').update('activeModel', item.model.name, true);
        vscode.window.showInformationMessage(`✅ Active model: ${item.model.name}`);
        this.refresh();
    }
}

class ModelItem extends vscode.TreeItem {
    constructor(
        public readonly model: OllamaModel,
        public readonly isActive: boolean,
        public readonly providerLabel: string,
        public readonly isOnline: boolean = false
    ) {
        super(model.name, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'modelItem';
        const sizeGb = (model.size / (1024 * 1024 * 1024)).toFixed(1);
        const emoji = isOnline ? '🌐' : '💻';
        this.description = `${emoji} ${providerLabel} ${isOnline ? '' : `· ${sizeGb} GB`}`;
        this.tooltip = `${model.name} (${providerLabel})${isActive ? ' — ACTIVE' : ''}`;
        
        if (isActive) {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            this.label = `● ${model.name}`;
        } else {
            this.iconPath = new vscode.ThemeIcon(isOnline ? 'cloud' : 'database');
        }
    }
}
