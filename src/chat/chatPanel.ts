import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { AgentLoop, AgentEvent, AgentMode } from '../agent/agentLoop';
import { RuntimeTask } from '../runtime/autonomousRuntimeState';
import { MemoryStore } from '../memory/memoryStore';
import { ContextProvider } from '../context/contextProvider';
import { ModelRegistry } from '../ai/modelRegistry';
import { HybridModelRuntime, RuntimeStatusSnapshot } from '../runtime/hybridModelRuntime';

type RuntimeChanged = (discoverModels?: boolean) => Promise<void> | void;

interface WorkspaceStats {
    rootName: string;
    rootPath: string;
    files: number;
    sourceFiles: number;
    folders: number;
    lines: number;
    packageManager: string;
    conversations: number;
}

interface PanelRuntimeStatus extends RuntimeStatusSnapshot {
    workspaceStats: WorkspaceStats;
    goal: string;
    tasks: RuntimeTask[];
    completed: number;
    pending: number;
    failed: number;
    retries: number;
    recentEvents: string[];
    confidence: number;
    autonomyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAX';
    learningScore: number;
    updatedAt: number;
    extensionVersion: string;
}

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'sinter.chatPanel';
    private webviewView?: vscode.WebviewView;
    private memory: MemoryStore | null = null;
    private contextProvider: ContextProvider | null = null;
    private workspaceStatsCache?: { at: number; value: WorkspaceStats };

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly agent: AgentLoop,
        private readonly runtime: HybridModelRuntime,
        private readonly modelRegistry: ModelRegistry,
        private readonly onRuntimeChanged: RuntimeChanged,
    ) {}

    setMemory(memory: MemoryStore): void { this.memory = memory; }
    setContextProvider(contextProvider: ContextProvider): void { this.contextProvider = contextProvider; }

    resolveWebviewView(view: vscode.WebviewView): void {
        this.webviewView = view;
        view.webview.options = { enableScripts: true, localResourceRoots: [this.extensionUri] };
        view.webview.html = this.getHtml();
        void this.discoverModels();

        view.webview.onDidReceiveMessage(async (msg) => {
            try {
                switch (msg.type) {
                    case 'send':
                        await this.handleSend(msg);
                        break;
                    case 'clear':
                    case 'newChat':
                        this.agent.clearHistory();
                        this.postMessage({ type: 'cleared' });
                        this.sendRuntimeStatus();
                        break;
                    case 'stop':
                        this.agent.cancel();
                        this.postMessage({ type: 'agentDone' });
                        this.sendRuntimeStatus();
                        break;
                    case 'modeChange':
                        this.agent.setMode(msg.mode as AgentMode);
                        await this.onRuntimeChanged(false);
                        this.sendRuntimeStatus();
                        break;
                    case 'getHistory':
                        this.sendConversationList();
                        break;
                    case 'loadConversation':
                        this.loadConversation(msg.id);
                        break;
                    case 'deleteConversation':
                        this.deleteConversation(msg.id);
                        break;
                    case 'contextSearch':
                        if (this.contextProvider) {
                            this.postMessage({ type: 'contextResults', items: await this.contextProvider.search(msg.query || '') });
                        }
                        break;
                    case 'toggle120B':
                        await vscode.commands.executeCommand('sinter.toggle120BMode', !!msg.enabled);
                        this.sendRuntimeStatus();
                        break;
                    case 'selectModel':
                        await this.selectModelFromPanel(msg.modelId);
                        break;
                    case 'discoverModels':
                        await this.discoverModels();
                        break;
                    case 'manageKeys':
                        await vscode.commands.executeCommand('sinter.manageGroqKeys');
                        this.sendRuntimeStatus();
                        break;
                    case 'toggleGroq':
                        this.runtime.set120BMode(!!msg.enabled);
                        await this.onRuntimeChanged(false);
                        this.sendRuntimeStatus();
                        break;
                    case 'pullModel':
                        await vscode.commands.executeCommand('sinter.pullModel');
                        break;
                    case 'getRuntimeStatus':
                        this.sendRuntimeStatus();
                        break;
                    case 'webviewError':
                        console.error('Sinter webview error:', msg.message);
                        break;
                }
            } catch (error) {
                this.postMessage({ type: 'agentEvent', event: { type: 'error', content: `UI message failed: ${(error as Error).message}` } satisfies AgentEvent });
                this.postMessage({ type: 'agentDone' });
                this.sendRuntimeStatus();
            }
        });

        this.sendRuntimeStatus();
    }

    postMessage(msg: unknown): void {
        this.webviewView?.webview.postMessage(msg);
    }

    sendPrefilled(text: string, mode?: AgentMode): void {
        const resolvedMode = mode || this.inferUnifiedMode(text);
        this.agent.setMode(resolvedMode);
        void this.handleMessage(text, text, resolvedMode);
    }

    async sendRuntimeStatus(): Promise<void> {
        this.postMessage({ type: 'runtimeStatus', status: this.buildRuntimeStatus() });
    }

    private async handleSend(msg: any): Promise<void> {
        let finalMessage = String(msg.text || '').trim();
        if (!finalMessage && !msg.contextItems?.length) {
            this.postMessage({ type: 'agentEvent', event: { type: 'info', content: 'Type a request first.' } satisfies AgentEvent });
            return;
        }

        if (msg.contextItems?.length && this.contextProvider) {
            const resolved = [];
            for (const item of msg.contextItems) {
                if (item.isRaw) {
                    resolved.push({ tag: item.label, type: 'raw', content: item.content });
                } else {
                    resolved.push(await this.contextProvider.resolve(item));
                }
            }
            finalMessage = `${this.contextProvider.buildContextString(resolved)}\n\n${finalMessage}`.trim();
        }

        const displayMessage = msg.displayMsg || msg.text || finalMessage || '';
        await this.handleMessage(finalMessage, displayMessage, this.resolveRequestedMode(finalMessage, msg.mode));
    }

    private async handleMessage(text: string, displayMessage: string, mode: AgentMode): Promise<void> {
        this.agent.setMode(mode);
        await this.onRuntimeChanged(false);
        this.postMessage({ type: 'userMessage', text: displayMessage });
        this.postMessage({ type: 'agentStart' });
        this.sendRuntimeStatus();

        try {
            for await (const event of this.agent.run(text)) {
                this.postMessage({ type: 'agentEvent', event });
                this.sendRuntimeStatus();
            }
        } catch (error) {
            this.postMessage({ type: 'agentEvent', event: { type: 'error', content: `Fatal: ${(error as Error).message}` } satisfies AgentEvent });
        }

        this.postMessage({ type: 'agentDone' });
        this.sendRuntimeStatus();
    }

    private sendConversationList(): void {
        if (!this.memory) { return; }
        this.postMessage({ type: 'conversationList', conversations: this.memory.listConversations() });
    }

    private loadConversation(id: string): void {
        if (!this.memory) { return; }
        const conversation = this.memory.switchConversation(id);
        if (conversation) {
            this.agent.loadConversation(id);
            this.postMessage({ type: 'loadedConversation', conversation });
            this.sendRuntimeStatus();
        }
    }

    private deleteConversation(id: string): void {
        if (!this.memory) { return; }
        this.memory.deleteConversation(id);
        this.sendConversationList();
        this.sendRuntimeStatus();
    }

    private async discoverModels(): Promise<void> {
        // Send current status immediately so UI isn't stuck at "Checking..."
        this.sendRuntimeStatus();
        
        try {
            const discovered = await this.modelRegistry.discoverAll();
            this.runtime.setDiscoveredModels(discovered);
            // Send again once discovery finishes
            this.sendRuntimeStatus();
        } catch (e) {
            console.error('Model discovery failed:', e);
            this.postMessage({ type: 'agentEvent', event: { type: 'error', content: `Ollama Discovery Failed: ${(e as Error).message}` } });
        }
    }

    private async selectModelFromPanel(modelId: string): Promise<void> {
        if (!modelId) { return; }
        this.runtime.setSelectedModel(modelId);
        const selected = this.runtime.getModelDescriptors().find((model) => model.id === modelId);
        const config = vscode.workspace.getConfiguration('sinter');
        await config.update('selectedRuntimeModel', modelId, true);
        await config.update('use120BMode', selected?.location === 'cloud', true);
        await config.update('runtimeRouteMode', selected?.location === 'cloud' ? 'cloud-120b' : 'local', true);
        if (selected?.location === 'local') {
            await config.update('localDefaultModel', selected.name, true);
            await config.update('activeModel', selected.name, true);
        } else if (selected?.location === 'cloud') {
            await config.update('groqModel', selected.name, true);
        }
        await this.onRuntimeChanged(false);
        this.sendRuntimeStatus();
    }

    private resolveRequestedMode(text: string, requested?: string): AgentMode {
        const validModes = new Set<AgentMode>(['chat', 'agent', 'computer', 'max', 'deep', 'planning', 'debug', 'monitor']);
        if (requested && requested !== 'auto' && validModes.has(requested as AgentMode)) {
            return requested as AgentMode;
        }
        return this.inferUnifiedMode(text);
    }

    private inferUnifiedMode(text: string): AgentMode {
        const lower = text.toLowerCase();
        const hasAny = (terms: string[]) => terms.some((term) => lower.includes(term));

        if (hasAny(['runtime status', 'monitor', 'state report', '\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644', '\u0631\u0627\u0642\u0628'])) {
            return 'monitor';
        }
        if (hasAny(['screenshot', 'screen', 'click', 'mouse', 'keyboard', 'desktop', '\u0627\u0641\u062a\u062d \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c', '\u0627\u0636\u063a\u0637', '\u0627\u0644\u0634\u0627\u0634\u0629', '\u0627\u0644\u0645\u0627\u0648\u0633'])) {
            return 'computer';
        }
        if (hasAny(['debug', 'fix error', 'fix bug', 'stack trace', 'exception', '\u0641\u0634\u0644', '\u062e\u0637\u0623', '\u0627\u0635\u0644\u062d', '\u0623\u0635\u0644\u062d', '\u0639\u0637\u0644'])) {
            return 'debug';
        }
        if (hasAny(['plan', 'architecture', 'roadmap', 'design first', '\u062e\u0637\u0629', '\u0645\u0639\u0645\u0627\u0631\u064a\u0629', '\u062a\u0635\u0645\u064a\u0645'])) {
            return 'planning';
        }
        if (hasAny(['analyze', 'review', 'audit', 'deep analysis', 'refactor', 'understand the project', '\u062d\u0644\u0644', '\u0631\u0627\u062c\u0639', '\u062a\u062d\u0644\u064a\u0644', '\u0627\u0641\u062d\u0635 \u0627\u0644\u0645\u0634\u0631\u0648\u0639'])) {
            return 'deep';
        }
        if (hasAny(['full project', 'entire app', 'from scratch', 'large project', 'production-ready', '\u0645\u0634\u0631\u0648\u0639 \u0643\u0627\u0645\u0644', '\u0645\u0646 \u0627\u0644\u0635\u0641\u0631'])) {
            return 'max';
        }
        // Action detection — auto-switch to agent mode
        if (hasAny([
            'create', 'build', 'write', 'edit', 'run', 'execute', 'install', 'generate',
            'change', 'make', 'website', 'web app', 'project', 'app',
            'do it', 'fix', 'add', 'delete', 'remove', 'update', 'modify', 'open',
            'start', 'stop', 'deploy', 'test', 'compile', 'launch', 'setup',
            'improve', 'optimize', 'upgrade', 'develop', 'implement',
            '\u0627\u0646\u0634\u0626', '\u0623\u0646\u0634\u0626', '\u0627\u0643\u062a\u0628', '\u0627\u0628\u0646\u064a', '\u0627\u0639\u0645\u0644', '\u0634\u063a\u0644', '\u0646\u0641\u0630', '\u0639\u062f\u0644', '\u0648\u064a\u0628', '\u0645\u0648\u0642\u0639',
            '\u0627\u0636\u0641', '\u0627\u062d\u0630\u0641', '\u0637\u0648\u0631', '\u062d\u0633\u0646', '\u0634\u063a\u0644\u0647', '\u0646\u0641\u0630\u0647', '\u0627\u0641\u062a\u062d'
        ])) {
            return 'agent';
        }
        return 'chat';
    }

    private buildRuntimeStatus(): PanelRuntimeStatus {
        const goal = this.agent.getRuntimeState();
        const providerInfo = this.agent.getProviderInfo();
        const base = this.runtime.snapshot({
            taskCount: goal.tasks.length,
            goalProgress: goal.progress,
            executionState: goal.executionState,
            agentState: this.agent.getMode(),
            toolState: this.agent.isRunning() ? 'busy' : 'idle',
            validationState: goal.recentEvents.some((event) => event.includes('validation')) ? 'tracked' : 'not-run',
        });
        if (providerInfo.model) {
            base.activeModel = providerInfo.model;
        }
        if (providerInfo.provider) {
            base.activeProvider = providerInfo.provider;
        }
        base.location = providerInfo.isOnline ? 'cloud' : base.location;

        const workspaceStats = this.getWorkspaceStats();
        const confidence = this.computeConfidence(base, goal.tasks.length);
        const learningScore = Math.min(99, 45 + workspaceStats.conversations * 5 + goal.checkpoints.length * 8);

        return {
            ...base,
            workspaceStats,
            goal: goal.goal,
            tasks: goal.tasks,
            completed: goal.completed,
            pending: goal.pending,
            failed: goal.failed,
            retries: goal.retryCount,
            recentEvents: goal.recentEvents.slice(-10),
            confidence,
            autonomyLevel: confidence >= 92 ? 'MAX' : confidence >= 78 ? 'HIGH' : confidence >= 55 ? 'MEDIUM' : 'LOW',
            learningScore,
            updatedAt: Date.now(),
            extensionVersion: this.getPackageVersion(),
        };
    }

    private computeConfidence(status: RuntimeStatusSnapshot, taskCount: number): number {
        let score = status.location === 'cloud' ? 92 : 82;
        if (status.agentState === 'max') { score += 7; }
        if (status.agentState === 'agent') { score += 5; }
        if (status.validationState === 'tracked') { score += 3; }
        if (status.executionState === 'failed') { score -= 25; }
        if (taskCount > 0 && status.goalProgress === 0 && status.toolState === 'busy') { score -= 4; }
        return Math.max(5, Math.min(99, score));
    }

    private getWorkspaceStats(): WorkspaceStats {
        const now = Date.now();
        if (this.workspaceStatsCache && now - this.workspaceStatsCache.at < 5000) {
            return this.workspaceStatsCache.value;
        }

        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        const stats: WorkspaceStats = {
            rootName: root ? path.basename(root) : 'No workspace',
            rootPath: root,
            files: 0,
            sourceFiles: 0,
            folders: 0,
            lines: 0,
            packageManager: this.detectPackageManager(root),
            conversations: this.memory ? this.memory.listConversations().length : 0,
        };

        if (root && fs.existsSync(root)) {
            this.scanWorkspace(root, stats, 0);
        }

        this.workspaceStatsCache = { at: now, value: stats };
        return stats;
    }

    private scanWorkspace(dir: string, stats: WorkspaceStats, depth: number): void {
        if (depth > 8 || stats.files > 5000) { return; }
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (entry.name.startsWith('.') || ['node_modules', 'out', 'dist', 'build', 'coverage'].includes(entry.name)) {
                continue;
            }
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                stats.folders += 1;
                this.scanWorkspace(fullPath, stats, depth + 1);
            } else {
                stats.files += 1;
                if (this.isSourceLike(entry.name)) {
                    stats.sourceFiles += 1;
                    stats.lines += this.countLines(fullPath);
                }
            }
        }
    }

    private isSourceLike(fileName: string): boolean {
        return /\.(ts|tsx|js|jsx|json|css|html|md|py|go|rs|java|cs|php|rb|vue|svelte)$/i.test(fileName);
    }

    private countLines(filePath: string): number {
        try {
            const stat = fs.statSync(filePath);
            if (stat.size > 1024 * 1024) { return 0; }
            return fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).length;
        } catch {
            return 0;
        }
    }

    private detectPackageManager(root: string): string {
        if (!root) { return 'none'; }
        if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) { return 'pnpm'; }
        if (fs.existsSync(path.join(root, 'yarn.lock'))) { return 'yarn'; }
        if (fs.existsSync(path.join(root, 'package-lock.json'))) { return 'npm'; }
        if (fs.existsSync(path.join(root, 'package.json'))) { return 'npm'; }
        if (fs.existsSync(path.join(root, 'pyproject.toml'))) { return 'python'; }
        if (fs.existsSync(path.join(root, 'go.mod'))) { return 'go'; }
        if (fs.existsSync(path.join(root, 'Cargo.toml'))) { return 'cargo'; }
        return 'none';
    }

    private getPackageVersion(): string {
        try {
            const packagePath = path.join(this.extensionUri.fsPath, 'package.json');
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
            return String(pkg.version || '2.0.6');
        } catch {
            return '2.0.6';
        }
    }

    private getHtml(): string {
        const initialStatus = JSON.stringify(this.buildRuntimeStatus()).replace(/</g, '\\u003c');
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
*{box-sizing:border-box}
:root{
  --bg:#060816;--bg2:#080b1e;--panel:#0d1028;--panel2:#12163a;--panel3:#171b45;
  --line:#2a2f62;--line2:#20254f;--text:#f5f3ff;--muted:#b9b4df;--faint:#7d78a8;
  --violet:#8a4dff;--violet2:#5f35d7;--cyan:#28e0d1;--blue:#54a6ff;--green:#23d7a4;
  --amber:#ffcc66;--rose:#ff6f91;--input:#0a0d25;
}
html,body{height:100%;margin:0;background:radial-gradient(circle at 16% 0%,#21104a 0,#080a1b 38%,#050713 100%);color:var(--text);font-family:Inter,Segoe UI,system-ui,sans-serif;font-size:13px;letter-spacing:0}
button,select,textarea{font:inherit}
button{border:1px solid var(--line);background:linear-gradient(180deg,#171b43,#10142f);color:var(--text);border-radius:7px;height:34px;padding:0 11px;cursor:pointer}
button:hover{border-color:#6b58dd;box-shadow:0 0 0 1px rgba(138,77,255,.18)}
button:disabled{opacity:.55;cursor:not-allowed}
button.icon{width:34px;padding:0;display:grid;place-items:center}
button.primary{width:58px;height:58px;border-radius:50%;border-color:#7653ef;background:radial-gradient(circle at 38% 30%,#a373ff,#5d2ce0 72%);box-shadow:0 14px 35px rgba(95,53,215,.45)}
button.danger{border-color:#74334d;background:#271328;color:#ffdce8}
.app{height:100vh;min-width:860px;display:grid;grid-template-rows:72px 1fr;background:linear-gradient(180deg,rgba(18,15,51,.86),rgba(6,8,22,.96))}
.titlebar{display:grid;grid-template-columns:280px 1fr 260px;align-items:center;border-bottom:1px solid rgba(138,77,255,.24);padding:0 22px;background:rgba(7,8,27,.78);backdrop-filter:blur(16px)}
.brand{display:flex;align-items:center;gap:13px;min-width:0}
.logo{width:43px;height:43px;border-radius:12px;background:conic-gradient(from 220deg,#54a6ff,#8a4dff,#b46bff,#28e0d1,#54a6ff);position:relative;box-shadow:0 0 30px rgba(138,77,255,.42)}
.logo:after{content:"";position:absolute;inset:12px 10px;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:18px solid rgba(255,255,255,.72);filter:drop-shadow(0 0 8px #fff)}
.brand-title{font-size:17px;font-weight:800;line-height:1.1}.brand-sub{color:var(--muted);font-size:12px;margin-top:3px}
.mode-select{justify-self:center;display:flex;align-items:center;gap:11px;min-width:240px;height:42px;border:1px solid rgba(126,95,255,.35);border-radius:12px;background:rgba(15,18,48,.9);padding:0 18px;box-shadow:inset 0 0 24px rgba(138,77,255,.08)}
.mode-mark{font-size:20px;color:#b884ff}.window-tools{display:flex;justify-content:flex-end;gap:10px}.pulse{color:var(--cyan);border-color:#33448b;background:#151a42}
.shell{display:grid;grid-template-columns:250px minmax(430px,1fr) 318px;gap:14px;padding:14px;height:calc(100vh - 72px);min-height:0}
.sidebar,.insights,.console{border:1px solid rgba(108,87,214,.28);background:linear-gradient(180deg,rgba(17,20,52,.86),rgba(8,10,30,.94));border-radius:8px;min-height:0;box-shadow:0 18px 50px rgba(0,0,0,.22)}
.sidebar,.insights{display:flex;flex-direction:column;overflow:hidden}
.nav{padding:12px 9px;display:flex;flex-direction:column;gap:6px}
.nav button{height:49px;text-align:left;display:flex;align-items:center;gap:13px;background:transparent;border-color:transparent;color:#dcd7ff;font-size:14px}
.nav button.active{background:linear-gradient(90deg,rgba(138,77,255,.86),rgba(98,53,213,.46));border-color:rgba(157,119,255,.35);box-shadow:0 12px 36px rgba(98,53,213,.28)}
.nav-icon{width:21px;text-align:center;color:#c9c0ff}
.agent-card{margin:8px 18px 14px;border:1px solid rgba(112,93,214,.34);border-radius:8px;background:linear-gradient(180deg,rgba(25,28,68,.75),rgba(12,14,37,.9));padding:14px}
.agent-card-head{display:flex;justify-content:space-between;align-items:center;color:#e8e3ff;font-size:12px}.dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:var(--green);box-shadow:0 0 12px var(--green)}
.confidence-ring{width:150px;height:150px;margin:17px auto 10px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--violet) calc(var(--score,0)*1%),rgba(82,73,154,.23) 0);position:relative;box-shadow:0 0 42px rgba(138,77,255,.3)}
.confidence-ring:after{content:"";position:absolute;inset:16px;border-radius:50%;background:#0c0e2b;border:1px solid rgba(138,77,255,.28)}
.confidence-ring span{position:relative;z-index:1;font-size:25px;font-weight:800;color:#8df5ec}
.small-label{text-align:center;color:var(--muted);font-size:11px}.agent-foot{border-top:1px solid rgba(112,93,214,.18);margin-top:13px;padding-top:12px;text-align:center;color:#b680ff}
.profile{margin-top:auto;border-top:1px solid rgba(112,93,214,.22);padding:14px 18px;display:flex;align-items:center;gap:12px;background:rgba(9,11,31,.78)}.avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#555fcb,#171b45);display:grid;place-items:center}.version{margin-left:auto;border:1px solid rgba(126,95,255,.26);background:#15183c;border-radius:7px;padding:6px 9px;color:#cbbdff}
.console{display:grid;grid-template-rows:auto 1fr auto;overflow:hidden}
.console-head{padding:21px 28px 14px;border-bottom:1px solid rgba(112,93,214,.22);display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
.console-title{font-size:25px;font-weight:800;margin:0 0 4px}.console-sub{color:var(--muted);font-size:13px}.agent-pill{height:38px;border-radius:999px;padding:0 18px;background:rgba(107,62,226,.32);border-color:rgba(157,119,255,.42);color:#d7bbff}
.messages{overflow:auto;padding:14px 28px 12px;display:flex;flex-direction:column;gap:14px}
.message{max-width:92%;border:1px solid var(--line2);border-radius:8px;padding:12px 14px;line-height:1.58;word-break:break-word;box-shadow:0 10px 28px rgba(0,0,0,.15)}
.message.user{align-self:flex-end;background:linear-gradient(135deg,#8047ff,#3821bb);border-color:#8f68ff;min-width:260px}
.message.assistant{align-self:flex-start;background:rgba(15,18,48,.88);border-color:rgba(112,93,214,.3)}
.message.info{align-self:center;background:rgba(25,28,68,.74);color:#cdc7f4;padding:7px 12px;font-size:12px}
.message.tool,.message.validation,.message.reflection,.message.checkpoint{align-self:stretch;max-width:100%;font-family:Cascadia Code,Consolas,monospace;font-size:11px;background:#070b22}
.message.tool{border-color:#3657a8}.message.validation{border-color:#7b6740}.message.reflection{border-color:#297e83}.message.checkpoint{border-color:#6958c9}.message.error{align-self:stretch;background:#25111f;border-color:#7d3152;color:#ffd6e6}
.thought-container{margin:8px 0;border-left:2px solid rgba(138,77,255,.3);background:transparent;overflow:hidden}
.thought-header{padding:4px 8px;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--muted);transition:color .2s}
.thought-header:hover{color:var(--text)}
.thought-header:before{content:"\u25b8";font-size:10px;transition:transform .2s;color:var(--faint)}
.thought-header.open:before{transform:rotate(90deg)}
.thought-content{padding:8px 8px 8px 24px;font-size:12px;color:var(--faint);line-height:1.6;display:none;border-left:1px solid rgba(138,77,255,.1)}
.thought-content.open{display:block}
.thought-timer{font-size:11px;color:var(--faint);margin-left:4px}
.message pre{background:#07091c;border:1px solid #252b5a;border-radius:7px;padding:11px;overflow:auto}.message code{font-family:Cascadia Code,Consolas,monospace;background:#0a0e25;border:1px solid #242a58;border-radius:5px;padding:1px 5px}.message pre code{background:transparent;border:0;padding:0}
.live-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(210px,.62fr);gap:12px;margin-top:10px}.live-card{border:1px solid rgba(112,93,214,.32);border-radius:8px;background:rgba(9,12,35,.82);padding:13px}.live-card h3{margin:0 0 10px;font-size:13px}.task-row{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:center;padding:5px 0;color:#d8d3fa}.check{width:17px;height:17px;border-radius:50%;display:grid;place-items:center;border:1px solid #574dc4;color:var(--cyan);font-size:11px}.tree{font-family:Cascadia Code,Consolas,monospace;color:#ddd8ff;font-size:12px;line-height:1.75}.tag{display:inline-flex;border:1px solid rgba(112,93,214,.42);border-radius:6px;padding:3px 7px;color:#bba6ff;background:rgba(79,52,171,.2);font-size:11px;margin-top:4px}
.stream{border:1px solid rgba(112,93,214,.3);border-radius:8px;background:rgba(8,10,28,.86);padding:12px;margin-top:10px}.bar{height:6px;border-radius:999px;background:#1b1f4b;overflow:hidden}.bar span{display:block;height:100%;width:0;background:linear-gradient(90deg,#28e0d1,#8a4dff,#ff6f91);transition:width .25s ease}.terminal{margin-top:12px;background:#06091b;border:1px solid #202653;border-radius:7px;padding:11px;font-family:Cascadia Code,Consolas,monospace;font-size:11px;color:#c8c2ec;min-height:76px;max-height:126px;overflow:auto}
.composer{padding:10px 12px 12px;background:rgba(12,15,39,.92);border-top:1px solid rgba(112,93,214,.24)}
.chips{display:flex;gap:7px;flex-wrap:wrap;min-height:0;margin:0 0 7px 4px}.chip{display:inline-flex;gap:6px;align-items:center;border:1px solid #3b568f;background:#101c3f;color:#b9f5ef;border-radius:999px;padding:4px 8px;font-size:11px}.chip button{height:16px;width:16px;padding:0;border:0;background:transparent;color:#b9f5ef}
.composer-box{border:1px solid rgba(126,95,255,.46);border-radius:13px;background:linear-gradient(180deg,#11153a,#0a0d25);padding:11px;box-shadow:0 0 28px rgba(98,53,213,.22);position:relative;z-index:2}
.composer-row{display:flex;gap:10px;align-items:flex-end}textarea{flex:1;min-height:44px;max-height:132px;resize:none;background:transparent;color:var(--text);border:0;padding:7px 4px;outline:0;font-size:13px}textarea::placeholder{color:#8d87b7}
.composer-actions{display:flex;align-items:center;gap:8px;margin-top:8px}.segmented{display:flex;gap:5px;border:1px solid #27305f;border-radius:8px;padding:4px;background:#090d27}.segmented button{height:27px;border-radius:6px;border-color:transparent;background:transparent;color:#bbb5e0;font-size:11px}.segmented button.active{background:rgba(118,83,239,.46);color:#fff;border-color:rgba(156,124,255,.32)}.spacer{flex:1}.typing{display:none;color:#bdb6e7;font-size:12px;margin-left:4px}.typing.on{display:block}
.context-pop{display:none;position:absolute;left:286px;right:340px;bottom:98px;max-height:230px;overflow:auto;background:#101337;border:1px solid #343a78;border-radius:8px;box-shadow:0 18px 40px rgba(0,0,0,.45);z-index:8}.context-pop.open{display:block}.context-item{padding:9px 11px;border-bottom:1px solid #242a58;cursor:pointer;display:flex;justify-content:space-between;gap:12px}.context-item:hover{background:#171b45}.context-item span:last-child{color:#8d87b7;font-size:11px}
.insights{padding:14px 12px;gap:12px}.insight-title{display:flex;justify-content:space-between;align-items:center;font-weight:800}.metric{border:1px solid rgba(112,93,214,.3);border-radius:8px;background:linear-gradient(180deg,rgba(18,22,58,.9),rgba(10,12,34,.92));padding:12px;display:grid;grid-template-columns:56px 1fr;gap:12px;align-items:center}.metric-icon{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#29328a,#111536);color:#70e8ff}.metric strong{font-size:21px;display:block}.metric small{color:var(--muted)}.mini-ring{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--cyan) calc(var(--value,0)*1%),#20254f 0);font-size:12px}.actions{border:1px solid rgba(112,93,214,.3);border-radius:8px;background:rgba(12,15,40,.78);padding:12px;min-height:116px}.actions h3{margin:0 0 10px;font-size:13px}.log{display:flex;justify-content:space-between;gap:10px;color:#c7c0ee;font-size:11px;padding:5px 0}.log span:last-child{color:#8d87b7}.learning{display:grid;grid-template-columns:64px 1fr;gap:12px;align-items:center}
.groq-toggle{margin:8px 12px;border:1px solid rgba(112,93,214,.34);border-radius:8px;background:linear-gradient(180deg,rgba(25,28,68,.75),rgba(12,14,37,.9));padding:12px}
.switch{position:relative;width:40px;height:22px;display:inline-block}.switch input{opacity:0;width:0;height:0}.slider{position:absolute;cursor:pointer;inset:0;background:#333;border-radius:22px;transition:.3s}.slider:before{content:"";position:absolute;height:16px;width:16px;left:3px;bottom:3px;background:#888;border-radius:50%;transition:.3s}input:checked+.slider{background:linear-gradient(90deg,#8a4dff,#28e0d1)}input:checked+.slider:before{transform:translateX(18px);background:#fff}
.hist-item{padding:8px 10px;border:1px solid transparent;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;color:#d8d3fa;font-size:12px;margin-bottom:3px}.hist-item:hover{background:rgba(138,77,255,.15);border-color:rgba(138,77,255,.3)}.hist-item .del{opacity:0;background:transparent;border:0;color:#ff6f91;cursor:pointer;font-size:14px;padding:0 4px}.hist-item:hover .del{opacity:1}
@media(max-width:1050px){.app{min-width:0}.titlebar{grid-template-columns:1fr auto}.mode-select{display:none}.window-tools{display:none}.shell{grid-template-columns:1fr}.sidebar,.insights{display:none}.context-pop{left:18px;right:18px}.live-grid{grid-template-columns:1fr}.messages{padding:14px}.console-head{padding:18px}.message.user{min-width:0}}
</style>
</head>
<body>
<div class="app">
  <header class="titlebar">
    <div class="brand"><div class="logo"></div><div><div class="brand-title">SINTER AI 5.0</div><div class="brand-sub">Unified IDE Agent</div></div></div>
    <div class="mode-select"><span class="mode-mark">oo</span><span>Unified Agent Mode</span><span style="margin-left:auto;color:#9d94cc">v</span></div>
    <div class="window-tools"><button class="icon pulse" id="pulseBtn" type="button">~</button><button class="icon" id="settingsBtn" type="button">*</button><button class="icon" type="button">-</button><button class="icon" type="button">[]</button></div>
  </header>
  <div class="shell">
    <aside class="sidebar">
      <nav class="nav">
        <button id="newChatBtn" type="button"><span class="nav-icon">+</span>New Chat</button>
        <button id="historyBtn" type="button"><span class="nav-icon">&#128172;</span>Conversations</button>
        <button id="discoverBtn" type="button"><span class="nav-icon">&#9881;</span>Models</button>
        <button id="pullModelBtn" type="button"><span class="nav-icon">&#8595;</span>Pull Model</button>
        <button id="keysBtn" type="button"><span class="nav-icon">&#128273;</span>API Keys</button>
      </nav>
      <div id="historyPanel" style="display:none;flex:1;overflow:auto;padding:8px 9px;border-top:1px solid var(--line)">
        <div style="color:var(--muted);font-size:11px;padding:4px 8px;margin-bottom:4px">Conversations</div>
        <div id="historyList"></div>
      </div>
      <div class="groq-toggle">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:12px;color:#e8e3ff">&#9729; Groq Cloud</span>
          <label class="switch"><input type="checkbox" id="groqToggle"><span class="slider"></span></label>
        </div>
        <div id="groqStatus" style="font-size:11px;color:var(--muted);margin-bottom:6px">Offline — Local only</div>
        <select id="modelSelect" style="width:100%;height:30px;background:#0a0d25;color:var(--text);border:1px solid var(--line);border-radius:6px;padding:0 8px;font-size:11px;margin-bottom:6px">
          <option value="">Loading models...</option>
        </select>
        <div id="connectionDot" style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)"><span class="dot" style="background:#ff4444;box-shadow:0 0 8px #ff4444" id="connDot"></span><span id="connText">Checking...</span></div>
      </div>
      <div class="agent-card">
        <div class="agent-card-head"><span><span class="dot"></span> Agent Status</span><span id="agentLevel">HIGH</span></div>
        <div class="confidence-ring" id="confidenceRing"><span id="confidenceValue">0%</span></div>
        <div class="small-label">Confidence Score</div>
        <div class="agent-foot" id="autonomyText">Autonomy Level</div>
      </div>
      <div class="profile"><div class="avatar">S</div><div><strong>Sinter AI</strong><div class="brand-sub">v2.0.6</div></div><div class="version" id="versionText">2.0.6</div></div>
    </aside>

    <main class="console">
      <div class="console-head">
        <div><h1 class="console-title">AI Console</h1><div class="console-sub">Your unified AI agent is ready. Describe what you want to build...</div></div>
        <div style="display:flex;gap:8px;align-items:center"><span class="agent-pill" id="stateBadge" style="background:rgba(40,224,209,.18);color:#28e0d1;font-size:11px">IDLE</span><button class="agent-pill" type="button" id="modeBadge">Agent Mode</button></div>
      </div>
      <section class="messages" id="messages"></section>
      <div class="composer">
        <div class="chips" id="chips"></div>
        <div class="composer-box">
          <div class="composer-row">
            <textarea id="input" rows="1" placeholder="Describe what you want to build..."></textarea>
            <button class="primary" id="sendBtn" type="button" title="Send message">^</button>
            <button class="danger" id="stopBtn" type="button" style="display:none">Stop</button>
          </div>
          <div class="composer-actions">
            <button class="icon" id="attachBtn" type="button" title="Attach context">@</button>
            <div class="segmented" id="modeButtons">
              <button class="active" type="button" data-mode="auto">Auto Mode</button>
              <button type="button" data-mode="planning">Ask Mode</button>
              <button type="button" data-mode="agent">Manual Mode</button>
            </div>
            <div class="typing" id="typing">Sinter is thinking...</div>
            <div class="spacer"></div>
          </div>
        </div>
      </div>
    </main>

    <aside class="insights">
      <div class="insight-title"><span>Agent Insights</span><span id="updatedAt">live</span></div>
      <div class="metric"><div class="mini-ring" id="progressRing">0%</div><div><small>Overall Progress</small><strong id="progressText">0%</strong><small id="progressState">Idle</small></div></div>
      <div class="metric"><div class="metric-icon">AI</div><div><small>Autonomy Level</small><strong id="autonomyMetric">HIGH</strong><small id="confidenceSmall">0%</small></div></div>
      <div class="metric"><div class="metric-icon">WS</div><div><small>Workspace Files</small><strong id="filesMetric">0</strong><small id="rootMetric">workspace</small></div></div>
      <div class="metric"><div class="metric-icon">&lt;/&gt;</div><div><small>Lines Indexed</small><strong id="linesMetric">0</strong><small id="packageMetric">package manager</small></div></div>
      <div class="actions"><h3>Recent Actions</h3><div id="activityLog"></div></div>
      <div class="actions learning"><div class="metric-icon">LG</div><div><small>Learning Status</small><strong id="learningText">Active</strong><div class="bar" style="margin-top:8px"><span id="learningBar"></span></div></div></div>
    </aside>
  </div>
</div>
<div class="context-pop" id="contextPop"></div>
<script>
(function(){
const vscode = typeof acquireVsCodeApi === 'function'
  ? acquireVsCodeApi()
  : (window._vscode || { postMessage:function(m){ console.log('webview message',m); }, getState:function(){ return {}; }, setState:function(){} });
window._vscode = vscode;
let status = ${initialStatus};
let currentMode = 'auto';
let running = false;
let messages = [];
let contextItems = [];
const stored = vscode.getState() || {};
if (Array.isArray(stored.messages)) messages = stored.messages;
if (stored.mode) currentMode = stored.mode;
const els = {
  messages: document.getElementById('messages'), input: document.getElementById('input'),
  send: document.getElementById('sendBtn'), stop: document.getElementById('stopBtn'),
  typing: document.getElementById('typing'), chips: document.getElementById('chips'),
  modeBadge: document.getElementById('modeBadge'), modeButtons: document.getElementById('modeButtons'),
  contextPop: document.getElementById('contextPop'), activityLog: document.getElementById('activityLog')
};
function saveState(){ vscode.setState({messages:messages.slice(-80),mode:currentMode}); }
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function compact(n){ n = Number(n || 0); return n >= 1000000 ? (n/1000000).toFixed(1)+'m' : n >= 1000 ? Math.round(n/1000)+'k' : String(n); }
function renderMarkdown(text){
  let html = esc(text);
  const tick = String.fromCharCode(96);
  const fence = new RegExp(tick+tick+tick+'([a-zA-Z0-9_-]*)\\\\n([\\\\s\\\\S]*?)'+tick+tick+tick,'g');
  const inlineCode = new RegExp(tick+'([^'+tick+']+)'+tick,'g');
  html = html.replace(fence,function(_,lang,code){return '<pre><code data-lang="'+esc(lang)+'">'+esc(code)+'</code></pre>';});
  html = html.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>');
  html = html.replace(inlineCode,'<code>$1</code>');
  return html.replace(/\\n/g,'<br>');
}
function addMessage(kind,text,skipStore){
  const node = document.createElement('div');
  node.className = 'message ' + kind;
  
  let processedText = text;
  let thoughtHtml = '';
  
  // Extract <thought> tags
  const thoughtMatch = text.match(/<thought>([\s\S]*?)<\/thought>/);
  if (thoughtMatch) {
    const thoughtText = thoughtMatch[1].trim();
    processedText = text.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
    
    // Estimate thought time based on length or just use the current running timer
    var elapsed = Math.floor((Date.now() - thinkingStart) / 1000);
    var timeStr = elapsed > 0 ? elapsed + 's' : '1s';
    
    thoughtHtml = '<div class="thought-container">' +
      '<div class="thought-header" onclick="this.classList.toggle(\'open\'); this.nextElementSibling.classList.toggle(\'open\');">' +
        '<span>Thought for ' + timeStr + '</span>' +
      '</div>' +
      '<div class="thought-content">' + renderMarkdown(thoughtText) + '</div>' +
    '</div>';
  }

  node.innerHTML = thoughtHtml + (processedText ? renderMarkdown(processedText) : '');
  els.messages.appendChild(node);
  els.messages.scrollTop = els.messages.scrollHeight;
  if(!skipStore){ messages.push({kind:kind,text:text}); saveState(); }
}
function addHtmlMessage(kind,html){
  const node = document.createElement('div');
  node.className = 'message ' + kind;
  node.innerHTML = html;
  els.messages.appendChild(node);
  els.messages.scrollTop = els.messages.scrollHeight;
}
function dashboardHtml(){
  const tasks = status.tasks || [];
  const rows = tasks.length ? tasks.slice(-6).map(function(task,index){
    const icon = task.status === 'completed' ? 'OK' : task.status === 'failed' ? '!!' : String(index + 1);
    return '<div class="task-row"><span class="check">'+esc(icon)+'</span><span>'+esc(task.title)+'</span><small>'+esc(task.status)+'</small></div>';
  }).join('') : '<div class="task-row"><span class="check">0</span><span>No active execution</span><small>idle</small></div>';
  const ws = status.workspaceStats || {};
  const events = (status.recentEvents || []).slice(-5).map(function(event){return '<div>'+esc(event.replace(/^.*?Z /,''))+'</div>';}).join('') || '<div>Waiting for first action</div>';
  return '<div class="live-grid">' +
    '<div class="live-card"><h3>Execution Plan</h3>'+rows+'</div>' +
    '<div class="live-card"><h3>Project Scope</h3><div class="tree">'+
    esc(ws.rootName || 'workspace')+'/<br>├─ files: '+compact(ws.files)+'<br>├─ source: '+compact(ws.sourceFiles)+'<br>└─ package: '+esc(ws.packageManager || 'none')+
    '</div><span class="tag">'+esc(status.activeModel || 'model')+'</span></div>' +
    '</div><div class="stream"><strong>Live Execution</strong><div class="bar" style="margin-top:10px"><span style="width:'+Number(status.goalProgress || 0)+'%"></span></div><div class="terminal">'+events+'</div></div>';
}
function restoreMessages(){
  els.messages.innerHTML = '';
  if(messages.length === 0){
    addHtmlMessage('assistant','<strong>Sinter AI Agent</strong> is ready. Tell me what to build, fix, inspect, or generate.' + dashboardHtml());
    return;
  }
  messages.forEach(function(m){ addMessage(m.kind,m.text,true); });
}
function addLog(text){
  const item = { text:String(text || 'status'), at:new Date().toLocaleTimeString() };
  const current = els.activityLog._items || [];
  current.unshift(item);
  els.activityLog._items = current.slice(0,8);
  renderActivity();
}
function renderActivity(){
  const realEvents = (status.recentEvents || []).slice(-5).reverse().map(function(e){return {text:e.replace(/^.*?Z /,''),at:''};});
  const manual = els.activityLog._items || [];
  const items = (manual.length ? manual : realEvents).slice(0,6);
  els.activityLog.innerHTML = items.length ? items.map(function(item){return '<div class="log"><span>'+esc(item.text)+'</span><span>'+esc(item.at)+'</span></div>';}).join('') : '<div class="log"><span>No actions yet</span><span></span></div>';
}
var thinkingTimer = null;
var thinkingStart = 0;
function setRunning(value){
  running = value;
  els.typing.classList.toggle('on', value);
  els.send.disabled = value;
  els.stop.style.display = value ? '' : 'none';
  // Thinking timer
  if(value){
    thinkingStart = Date.now();
    if(thinkingTimer) clearInterval(thinkingTimer);
    thinkingTimer = setInterval(function(){
      var elapsed = Math.floor((Date.now() - thinkingStart) / 1000);
      var mins = Math.floor(elapsed / 60);
      var secs = elapsed % 60;
      var timeStr = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
      var base = els.typing.getAttribute('data-base') || 'Thinking...';
      els.typing.textContent = base + ' (' + timeStr + ')';
    }, 1000);
  } else {
    if(thinkingTimer){ clearInterval(thinkingTimer); thinkingTimer = null; }
    els.typing.textContent = '';
    els.typing.removeAttribute('data-base');
  }
}
function resizeInput(){
  els.input.style.height = 'auto';
  els.input.style.height = Math.min(els.input.scrollHeight,132) + 'px';
}
function activeSendMode(text){
  if(currentMode !== 'auto') return currentMode;
  return inferRoute(text);
}
function send(){
  if(running) return;
  const text = els.input.value.trim();
  if(!text && contextItems.length === 0){ els.input.focus(); return; }
  const items = contextItems.slice();
  const display = (items.length ? items.map(function(c){ return '@' + String(c.label || '').replace('@',''); }).join(' ') + ' ' : '') + text;
  const mode = activeSendMode(text);
  contextItems = [];
  renderChips();
  els.input.value = '';
  resizeInput();
  addLog('message dispatched');
  try {
    vscode.postMessage({type:'send',text:text,displayMsg:display,mode:mode,contextItems:items});
  } catch (err) {
    addMessage('error','Send failed: ' + (err && err.message ? err.message : String(err)));
  }
}
function inferRoute(text){
  const lower = String(text || '').toLowerCase();
  function has(words){ return words.some(function(w){ return lower.indexOf(w) >= 0; }); }
  if(has(['runtime status','monitor','state report','\\u062d\\u0627\\u0644\\u0629 \\u0627\\u0644\\u062a\\u0634\\u063a\\u064a\\u0644','\\u0631\\u0627\\u0642\\u0628'])) return 'monitor';
  if(has(['screenshot','screen','click','mouse','keyboard','desktop','\\u0627\\u0641\\u062a\\u062d','\\u0627\\u0636\\u063a\\u0637'])) return 'computer';
  if(has(['debug','fix error','fix bug','stack trace','exception','\\u062e\\u0637\\u0623','\\u0627\\u0635\\u0644\\u062d'])) return 'debug';
  if(has(['plan','architecture','roadmap','design first','\\u062e\\u0637\\u0629','\\u062a\\u0635\\u0645\\u064a\\u0645'])) return 'planning';
  if(has(['analyze','review','audit','deep analysis','refactor','\\u062d\\u0644\\u0644','\\u0631\\u0627\\u062c\\u0639'])) return 'deep';
  if(has(['full project','entire app','from scratch','large project','production-ready','\\u0645\\u0634\\u0631\\u0648\\u0639 \\u0643\\u0627\\u0645\\u0644'])) return 'max';
  if(has(['create','build','write','edit','run','execute','install','generate','change','make','website','web app','project','app','\\u0627\\u0639\\u0645\\u0644','\\u0627\\u0628\\u0646\\u064a','\\u0627\\u0646\\u0634\\u0626','\\u0648\\u064a\\u0628','\\u0645\\u0648\\u0642\\u0639'])) return 'agent';
  return 'chat';
}
function setMode(mode){
  currentMode = mode;
  Array.prototype.forEach.call(els.modeButtons.querySelectorAll('button'),function(btn){ btn.classList.toggle('active',btn.dataset.mode === mode); });
  saveState();
}
function renderStatus(){
  if(!status) return;
  const ws = status.workspaceStats || {};
  document.getElementById('versionText').textContent = status.extensionVersion || '2.0.6';
  document.getElementById('confidenceValue').textContent = Number(status.confidence || 0) + '%';
  document.getElementById('confidenceRing').style.setProperty('--score', Number(status.confidence || 0));
  document.getElementById('agentLevel').textContent = status.autonomyLevel || 'HIGH';
  document.getElementById('autonomyText').textContent = 'Autonomy Level: ' + (status.autonomyLevel || 'HIGH');
  document.getElementById('progressRing').textContent = Number(status.goalProgress || 0) + '%';
  document.getElementById('progressRing').style.setProperty('--value', Number(status.goalProgress || 0));
  document.getElementById('progressText').textContent = Number(status.goalProgress || 0) + '%';
  document.getElementById('progressState').textContent = status.executionState || 'idle';
  document.getElementById('autonomyMetric').textContent = status.autonomyLevel || 'HIGH';
  document.getElementById('confidenceSmall').textContent = Number(status.confidence || 0) + '% confidence';
  document.getElementById('filesMetric').textContent = compact(ws.files);
  document.getElementById('rootMetric').textContent = ws.rootName || 'workspace';
  document.getElementById('linesMetric').textContent = compact(ws.lines);
  document.getElementById('packageMetric').textContent = ws.packageManager || 'none';
  document.getElementById('learningText').textContent = (ws.conversations || 0) + ' memory sessions';
  document.getElementById('learningBar').style.width = Number(status.learningScore || 0) + '%';
  document.getElementById('updatedAt').textContent = new Date(status.updatedAt || Date.now()).toLocaleTimeString();
  els.modeBadge.textContent = (status.agentState || 'agent') + ' mode';
  var sb = document.getElementById('stateBadge');
  var estate = (status.executionState || 'idle').toUpperCase();
  sb.textContent = estate;
  var sc = {IDLE:'rgba(40,224,209,.18)',PLANNING:'rgba(255,170,0,.18)',EXECUTING:'rgba(138,77,255,.25)',VALIDATING:'rgba(0,200,255,.18)',REFLECTING:'rgba(255,200,0,.18)',RETRYING:'rgba(255,100,0,.22)',COMPLETED:'rgba(0,255,100,.18)',FAILED:'rgba(255,50,50,.22)',PAUSED:'rgba(255,170,0,.22)'};
  var tc = {IDLE:'#28e0d1',PLANNING:'#ffaa00',EXECUTING:'#8a4dff',VALIDATING:'#00c8ff',REFLECTING:'#ffc800',RETRYING:'#ff6400',COMPLETED:'#00ff64',FAILED:'#ff3232',PAUSED:'#ffaa00'};
  sb.style.background = sc[estate] || sc.IDLE;
  sb.style.color = tc[estate] || tc.IDLE;
  renderActivity();
  updateConnection(status);
}
function renderHistory(items){
  addLog((items ? items.length : 0) + ' conversations indexed');
}
function contextSearch(){
  const value = els.input.value;
  const at = value.lastIndexOf('@');
  if(at < 0){ els.contextPop.classList.remove('open'); return; }
  const q = value.slice(at + 1);
  if(q.indexOf(' ') >= 0){ els.contextPop.classList.remove('open'); return; }
  vscode.postMessage({type:'contextSearch',query:q});
}
function showContext(items){
  if(!items || !items.length){ els.contextPop.classList.remove('open'); return; }
  els.contextPop.innerHTML = items.map(function(item,index){
    return '<div class="context-item" data-index="'+index+'"><span>'+esc(item.label)+'</span><span>'+esc(item.description)+'</span></div>';
  }).join('');
  els.contextPop._items = items;
  els.contextPop.classList.add('open');
  Array.prototype.forEach.call(els.contextPop.querySelectorAll('.context-item'),function(node){
    node.addEventListener('click',function(){
      const item = els.contextPop._items[Number(node.dataset.index)];
      contextItems.push(item);
      const value = els.input.value;
      const at = value.lastIndexOf('@');
      els.input.value = at >= 0 ? value.slice(0,at) : value;
      els.contextPop.classList.remove('open');
      renderChips();
      els.input.focus();
    });
  });
}
function renderChips(){
  els.chips.innerHTML = contextItems.map(function(item,index){ return '<span class="chip">'+esc(item.label)+'<button type="button" data-index="'+index+'">x</button></span>'; }).join('');
  Array.prototype.forEach.call(els.chips.querySelectorAll('button'),function(btn){ btn.addEventListener('click',function(){ contextItems.splice(Number(btn.dataset.index),1); renderChips(); }); });
}
els.send.addEventListener('click',function(e){ e.preventDefault(); send(); });
els.stop.addEventListener('click',function(){ vscode.postMessage({type:'stop'}); setRunning(false); });
els.input.addEventListener('keydown',function(e){ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); }});
els.input.addEventListener('input',function(){ resizeInput(); contextSearch(); });
document.getElementById('attachBtn').addEventListener('click',function(){ els.input.value += '@'; els.input.focus(); contextSearch(); });
document.getElementById('newChatBtn').addEventListener('click',function(){ vscode.postMessage({type:'newChat'}); });
document.getElementById('historyBtn').addEventListener('click',function(){
  var panel = document.getElementById('historyPanel');
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  vscode.postMessage({type:'getHistory'});
});
document.getElementById('keysBtn').addEventListener('click',function(){ vscode.postMessage({type:'manageKeys'}); });
document.getElementById('discoverBtn').addEventListener('click',function(){ vscode.postMessage({type:'discoverModels'}); });
document.getElementById('pullModelBtn').addEventListener('click',function(){ vscode.postMessage({type:'pullModel'}); });
document.getElementById('groqToggle').addEventListener('change',function(){
  var checked = this.checked;
  vscode.postMessage({type:'toggleGroq',enabled:checked});
  var dot = document.getElementById('connDot');
  var txt = document.getElementById('connText');
  var st = document.getElementById('groqStatus');
  if(checked){ dot.style.background='#ffaa00'; dot.style.boxShadow='0 0 8px #ffaa00'; txt.textContent='Connecting...'; st.textContent='Cloud mode activating...'; }
  else { dot.style.background='#44ff44'; dot.style.boxShadow='0 0 8px #44ff44'; txt.textContent='Ollama Local'; st.textContent='Offline — Local only'; }
});
document.getElementById('modelSelect').addEventListener('change',function(){
  var val = this.value;
  if(val) vscode.postMessage({type:'selectModel',modelId:val});
});
Array.prototype.forEach.call(els.modeButtons.querySelectorAll('button'),function(btn){ btn.addEventListener('click',function(){ setMode(btn.dataset.mode); }); });
window.onerror = function(message){ try{ vscode.postMessage({type:'webviewError',message:String(message)}); }catch(_){} };
function renderHistory(items){
  var panel = document.getElementById('historyPanel');
  var list = document.getElementById('historyList');
  if(!items || !items.length){ list.innerHTML='<div style="color:var(--muted);font-size:11px;padding:8px">No conversations yet</div>'; return; }
  panel.style.display = 'flex';
  list.innerHTML = items.map(function(c,i){
    var label = c.title || c.id || ('Chat #'+(i+1));
    return '<div class="hist-item" data-id="'+esc(c.id)+'"><span>'+esc(label.substring(0,30))+'</span><button class="del" data-id="'+esc(c.id)+'" title="Delete">×</button></div>';
  }).join('');
  Array.prototype.forEach.call(list.querySelectorAll('.hist-item'),function(node){
    node.addEventListener('click',function(e){ if(e.target.classList.contains('del')) return; vscode.postMessage({type:'loadConversation',id:node.dataset.id}); });
  });
  Array.prototype.forEach.call(list.querySelectorAll('.del'),function(btn){
    btn.addEventListener('click',function(e){ e.stopPropagation(); vscode.postMessage({type:'deleteConversation',id:btn.dataset.id}); btn.parentNode.remove(); });
  });
  addLog(items.length + ' conversations indexed');
}
function updateModelSelect(models){
  var sel = document.getElementById('modelSelect');
  if(!models || !models.length){
    sel.innerHTML = '<option value="">No models found</option>';
    return;
  }
  sel.innerHTML = models.map(function(m){
    var label = m.displayName || m.name || m.id;
    var loc = m.location === 'cloud' ? ' ☁' : ' 💻';
    return '<option value="'+esc(m.id)+'"'+(m.isSelected ? ' selected' : '')+'>'+esc(label)+loc+'</option>';
  }).join('');
}
function updateConnection(info){
  var dot = document.getElementById('connDot');
  var txt = document.getElementById('connText');
  var st = document.getElementById('groqStatus');
  var tog = document.getElementById('groqToggle');
  if(info.location === 'cloud'){
    dot.style.background='#28e0d1'; dot.style.boxShadow='0 0 8px #28e0d1'; txt.textContent=info.activeProvider || 'Groq Cloud'; st.textContent='Cloud 120B active'; tog.checked=true;
  } else {
    dot.style.background='#44ff44'; dot.style.boxShadow='0 0 8px #44ff44'; txt.textContent=info.activeProvider || 'Ollama Local'; st.textContent='Offline — Local only'; tog.checked=false;
  }
}
window.addEventListener('message',function(event){
  var msg = event.data || {};
  if(msg.type === 'runtimeStatus'){ status = msg.status; renderStatus(); if(status.modelDescriptors) updateModelSelect(status.modelDescriptors); updateConnection(status); return; }
  if(msg.type === 'focusInput'){ els.input.focus(); return; }
  if(msg.type === 'userMessage'){ addMessage('user', msg.text || ''); return; }
  if(msg.type === 'agentStart'){ setRunning(true); return; }
  if(msg.type === 'agentDone'){ setRunning(false); return; }
  if(msg.type === 'cleared'){ messages=[]; saveState(); restoreMessages(); return; }
  if(msg.type === 'conversationList'){ renderHistory(msg.conversations); return; }
  if(msg.type === 'contextResults'){ showContext(msg.items); return; }
  if(msg.type === 'modelList'){ updateModelSelect(msg.models); return; }
  if(msg.type === 'groqStatus'){ updateConnection(msg); return; }
  if(msg.type === 'injectContext'){ contextItems.push({label:msg.fileName,description:msg.preview,isRaw:true,content:msg.content,type:'file'}); renderChips(); els.input.focus(); return; }
  if(msg.type === 'loadedConversation'){
    messages = [];
    (msg.conversation.messages || []).forEach(function(m){ messages.push({kind:m.role === 'user' ? 'user' : 'assistant',text:m.content}); });
    saveState();
    restoreMessages();
    return;
  }
  if(msg.type === 'agentEvent'){
    var ev = msg.event || {};
    if(ev.type === 'thinking'){ var label = ev.content || 'Thinking...'; els.typing.setAttribute('data-base', label); els.typing.textContent = label; setRunning(true); addLog(ev.content || 'thinking'); }
    else if(ev.type === 'response'){ addMessage('assistant', ev.content || ''); }
    else if(ev.type === 'tool_call'){ addMessage('tool','Tool: '+(ev.toolName || '')+'\\n'+(ev.content || '')); addLog('tool '+(ev.toolName || '')); }
    else if(ev.type === 'tool_result'){ addMessage('tool', ev.content || ''); addLog('tool result'); }
    else if(ev.type === 'validation'){ addMessage('validation', ev.content || 'Validation'); addLog('validation'); }
    else if(ev.type === 'reflection'){ addMessage('reflection', ev.content || 'Reflection'); addLog('reflection'); }
    else if(ev.type === 'checkpoint'){ addMessage('checkpoint', ev.content || 'Checkpoint'); addLog('checkpoint'); }
    else if(ev.type === 'images'){ addMessage('tool', ev.content || 'Image result'); addLog('image result'); }
    else if(ev.type === 'status'){ addLog(ev.content || 'status'); }
    else if(ev.type === 'error'){ addMessage('error', ev.content || 'Error'); addLog('error'); }
    else if(ev.type === 'info'){ addMessage('info', ev.content || ''); addLog(ev.content || 'info'); }
    else if(ev.type === 'question'){
      var html = '<div style="margin-bottom:8px">' + renderMarkdown(ev.content || '') + '</div>';
      if(ev.metadata && ev.metadata.options){
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">';
        ev.metadata.options.forEach(function(opt){
          html += '<button type="button" class="opt-btn" style="height:auto;padding:6px 12px;font-size:11px;background:rgba(138,77,255,0.15);border-color:rgba(138,77,255,0.4)" onclick="window._vscode.postMessage({type:\'send\',text:\''+esc(opt)+'\'})">' + esc(opt) + '</button>';
        });
        html += '</div>';
      }
      addHtmlMessage('assistant', html);
      addLog('question asked');
    }
  }
});
setMode(currentMode);
restoreMessages();
renderStatus();
if(status.modelDescriptors) updateModelSelect(status.modelDescriptors);
updateConnection(status);
addLog('model discovery started');
vscode.postMessage({type:'discoverModels'});
vscode.postMessage({type:'getHistory'});
vscode.postMessage({type:'getRuntimeStatus'});
})();
</script>
</body>
</html>`;
    }
}
