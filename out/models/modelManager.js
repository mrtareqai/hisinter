"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Model Manager (v2 — Multi-Provider)
// List models from Ollama + OpenAI-compatible providers
// Pull, delete, switch models with provider labels
// ═══════════════════════════════════════════════════════════════
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelManagerProvider = void 0;
const vscode = __importStar(require("vscode"));
const ollamaClient_1 = require("../ai/ollamaClient");
const modelRegistry_1 = require("../ai/modelRegistry");
class ModelManagerProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    client;
    registry;
    constructor(ollamaUrl, registry) {
        this.client = new ollamaClient_1.OllamaClient(ollamaUrl);
        this.registry = registry || new modelRegistry_1.ModelRegistry();
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren() {
        try {
            const activeModel = vscode.workspace.getConfiguration('sinter').get('activeModel', 'deepseek-coder:6.7b');
            const items = [];
            // Discover from all providers via registry
            try {
                const discovered = await this.registry.discoverAll();
                for (const m of discovered) {
                    const provider = this.registry.getProvider(m.provider);
                    const providerLabel = provider ? provider.name : m.provider;
                    items.push(new ModelItem({ name: m.name, size: m.size || 0, digest: '', modified_at: '' }, m.name === activeModel, providerLabel, m.isOnline));
                }
            }
            catch {
                // Fallback to direct Ollama
                const models = await this.client.listModels();
                for (const m of models) {
                    items.push(new ModelItem(m, m.name === activeModel, 'Ollama'));
                }
            }
            if (items.length === 0) {
                return [new ModelItem({ name: 'No models found', size: 0, digest: '', modified_at: '' }, false, 'N/A')];
            }
            return items;
        }
        catch {
            return [new ModelItem({
                    name: '⚠️ Ollama not running',
                    size: 0, digest: '', modified_at: ''
                }, false, '')];
        }
    }
    async pullModel() {
        const name = await vscode.window.showInputBox({
            prompt: 'Model name to pull (e.g., phi3:mini, mistral, qwen2.5-coder:7b)',
            placeHolder: 'phi3:mini',
        });
        if (!name) {
            return;
        }
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
                    }
                    else {
                        progress.report({ message: update.status });
                    }
                }
                vscode.window.showInformationMessage(`✅ Model ${name} pulled successfully!`);
                this.refresh();
            }
            catch (e) {
                vscode.window.showErrorMessage(`❌ Failed to pull ${name}: ${e.message}`);
            }
        });
    }
    async deleteModel(item) {
        const confirm = await vscode.window.showWarningMessage(`Delete model "${item.model.name}"?`, { modal: true }, 'Delete');
        if (confirm !== 'Delete') {
            return;
        }
        try {
            await this.client.deleteModel(item.model.name);
            vscode.window.showInformationMessage(`🗑️ Model ${item.model.name} deleted.`);
            this.refresh();
        }
        catch (e) {
            vscode.window.showErrorMessage(`Failed: ${e.message}`);
        }
    }
    async setActiveModel(item) {
        await vscode.workspace.getConfiguration('sinter').update('activeModel', item.model.name, true);
        vscode.window.showInformationMessage(`✅ Active model: ${item.model.name}`);
        this.refresh();
    }
}
exports.ModelManagerProvider = ModelManagerProvider;
class ModelItem extends vscode.TreeItem {
    model;
    isActive;
    providerLabel;
    isOnline;
    constructor(model, isActive, providerLabel, isOnline = false) {
        super(model.name, vscode.TreeItemCollapsibleState.None);
        this.model = model;
        this.isActive = isActive;
        this.providerLabel = providerLabel;
        this.isOnline = isOnline;
        this.contextValue = 'modelItem';
        const sizeGb = (model.size / (1024 * 1024 * 1024)).toFixed(1);
        const emoji = isOnline ? '🌐' : '💻';
        this.description = `${emoji} ${providerLabel} ${isOnline ? '' : `· ${sizeGb} GB`}`;
        this.tooltip = `${model.name} (${providerLabel})${isActive ? ' — ACTIVE' : ''}`;
        if (isActive) {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            this.label = `● ${model.name}`;
        }
        else {
            this.iconPath = new vscode.ThemeIcon(isOnline ? 'cloud' : 'database');
        }
    }
}
//# sourceMappingURL=modelManager.js.map