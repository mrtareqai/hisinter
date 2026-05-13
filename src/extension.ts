import * as vscode from 'vscode';
import * as path from 'path';
import { OllamaClient } from './ai/ollamaClient';
import { ToolRegistry } from './tools/toolRegistry';
import { createFileTools } from './tools/fileTool';
import { createFileEditTools } from './tools/fileEditTool';
import { createTerminalTools } from './tools/terminalTool';
import { createBrowserTools } from './tools/browserTool';
import { createComputerUseTools } from './tools/computer/computerUseTool';
import { createDocumentTools } from './tools/documentTool';
import { createAstTools } from './tools/astTool';
import { createProjectTools } from './tools/projectTool';
import { AgentLoop, AgentMode } from './agent/agentLoop';
import { ChatPanelProvider } from './chat/chatPanel';
import { ModelManagerProvider } from './models/modelManager';
import { MemoryStore } from './memory/memoryStore';
import { ContextProvider } from './context/contextProvider';
import { ModelRegistry, ModelProvider } from './ai/modelRegistry';
import { GroqClient, GroqApiKey } from './ai/groqClient';
import { HybridModelRuntime, HybridRuntimeConfig, RuntimeRouteMode } from './runtime/hybridModelRuntime';

import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    const logPath = path.join(context.extensionPath, 'sinter-debug.log');
    const log = (m: string) => { try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${m}\n`); } catch {} };
    
    log('Activation started');
    try {
        console.log('Sinter AI activating...');

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    const screenshotDir = path.join(context.globalStorageUri?.fsPath || './', 'screenshots');
    const memoryDir = path.join(context.globalStorageUri?.fsPath || './', 'memory');

    const memory = new MemoryStore(memoryDir);
    const tools = new ToolRegistry();
    const ollamaUrl = vscode.workspace.getConfiguration('sinter').get<string>('ollamaUrl', 'http://localhost:11434');
    const modelRegistry = new ModelRegistry();
    modelRegistry.updateOllamaProvider(ollamaUrl);
    
    const runtime = new HybridModelRuntime(readRuntimeConfig());
    const modelManager = new ModelManagerProvider(ollamaUrl, modelRegistry);

    // Register tools
    for (const tool of createFileTools(workspaceRoot)) { tools.register(tool); }
    for (const tool of createFileEditTools(workspaceRoot)) { tools.register(tool); }
    for (const tool of createTerminalTools(workspaceRoot)) { tools.register(tool); }
    for (const tool of createBrowserTools()) { tools.register(tool); }
    for (const tool of createDocumentTools(workspaceRoot)) { tools.register(tool); }
    for (const tool of createAstTools(workspaceRoot)) { tools.register(tool); }
    for (const tool of createProjectTools(workspaceRoot)) { tools.register(tool); }
    if (vscode.workspace.getConfiguration('sinter').get<boolean>('computerUseEnabled', true)) {
        for (const tool of createComputerUseTools(screenshotDir)) { tools.register(tool); }
    }

    const activeSelection = runtime.getActiveSelection();
    const agent = new AgentLoop(tools, {
        model: activeSelection.model,
        ollamaUrl: vscode.workspace.getConfiguration('sinter').get<string>('ollamaUrl', 'http://localhost:11434'),
        systemPrompt: vscode.workspace.getConfiguration('sinter').get<string>('systemPrompt', ''),
        maxIterations: 24,
    });
    agent.setMode(vscode.workspace.getConfiguration('sinter').get<AgentMode>('defaultMode', 'chat'));
    agent.setMemory(memory);
    agent.setWorkspaceRoot(workspaceRoot);
    agent.setValidationEnabled(vscode.workspace.getConfiguration('sinter').get<boolean>('validationEnabled', true));
    agent.setProviderChain(runtime.buildProviderChain(agent.getMode()));

    const contextProvider = new ContextProvider(workspaceRoot);

    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.command = 'sinter.selectModel';
    statusBar.show();
    context.subscriptions.push(statusBar);

    let chatProvider: ChatPanelProvider;

    const rebuildRuntime = async (discoverModels = false) => {
        try {
            const config = vscode.workspace.getConfiguration('sinter');
            const ollamaUrl = config.get<string>('ollamaUrl', 'http://localhost:11434');
            runtime.update(readRuntimeConfig());
            modelRegistry.updateOllamaProvider(ollamaUrl);
            loadConfiguredProviders(modelRegistry);

            if (discoverModels) {
                runtime.setDiscoveredModels(await modelRegistry.discoverAll());
            }

            const selection = runtime.getActiveSelection(agent.getMode());
            agent.setModel(selection.model);
            agent.setProviderChain(runtime.buildProviderChain(agent.getMode()));
            agent.setValidationEnabled(config.get<boolean>('validationEnabled', true));
            modelManager.refresh();
            updateStatusBar(statusBar, runtime);
            chatProvider?.sendRuntimeStatus();
        } catch (e) {
            console.error('Rebuild runtime failed:', e);
        }
    };

    chatProvider = new ChatPanelProvider(context.extensionUri, agent, runtime, modelRegistry, rebuildRuntime);
    chatProvider.setMemory(memory);
    chatProvider.setContextProvider(contextProvider);

    // CRITICAL: Register providers immediately to avoid "no data provider registered"
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatPanelProvider.viewType, chatProvider),
        vscode.window.registerTreeDataProvider('sinter.modelManager', modelManager)
    );

    const updateActiveFile = () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        agent.setActiveFile(editor.document.uri.fsPath, editor.document.getText());
        chatProvider?.sendRuntimeStatus();
    };

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateActiveFile),
        vscode.workspace.onDidSaveTextDocument(updateActiveFile)
    );
    updateActiveFile();

    context.subscriptions.push(
        vscode.commands.registerCommand('sinter.newChat', () => {
            agent.clearHistory();
            chatProvider.postMessage({ type: 'cleared' });
            chatProvider.sendRuntimeStatus();
        }),

        vscode.commands.registerCommand('sinter.sendMessage', () => {
            chatProvider.postMessage({ type: 'focusInput' });
            chatProvider.sendRuntimeStatus();
        }),

        vscode.commands.registerCommand('sinter.selectModel', async () => {
            await selectRuntimeModel(runtime, modelRegistry);
            await rebuildRuntime(true);
        }),

        vscode.commands.registerCommand('sinter.pullModel', () => modelManager.pullModel()),

        vscode.commands.registerCommand('sinter.toggle120BMode', async (enabled?: boolean) => {
            const config = vscode.workspace.getConfiguration('sinter');
            const next = typeof enabled === 'boolean' ? enabled : !config.get<boolean>('use120BMode', false);
            runtime.set120BMode(next);
            await config.update('use120BMode', next, true);
            await config.update('runtimeRouteMode', next ? 'cloud-120b' : 'local', true);
            await config.update('selectedRuntimeModel', runtime.getActiveModelId(), true);
            await rebuildRuntime(false);
            vscode.window.showInformationMessage(`Sinter 120B Mode ${next ? 'enabled' : 'disabled'}`);
        }),

        vscode.commands.registerCommand('sinter.rebuildChain', () => rebuildRuntime(true)),

        vscode.commands.registerCommand('sinter.addGroqKey', async () => {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter Groq API key',
                placeHolder: 'gsk_xxxxxxxxxxxxxxxx',
                password: true,
                ignoreFocusOut: true,
            });
            if (!apiKey) { return; }

            const config = vscode.workspace.getConfiguration('sinter');
            const keys = config.get<GroqApiKey[]>('groqApiKeys', []);
            const label = await vscode.window.showInputBox({
                prompt: 'Label for this key',
                placeHolder: `Key #${keys.length + 1}`,
                value: `Key #${keys.length + 1}`,
            }) || `Key #${keys.length + 1}`;

            const updated = [...keys, { key: apiKey, label, enabled: true }];
            await config.update('groqApiKeys', updated, true);
            await rebuildRuntime(true);
            vscode.window.showInformationMessage(`Groq API key "${label}" added`);
        }),

        vscode.commands.registerCommand('sinter.manageGroqKeys', async () => {
            await manageGroqKeys();
            await rebuildRuntime(true);
        }),

        vscode.commands.registerCommand('sinter.setGroqModel', async () => {
            const config = vscode.workspace.getConfiguration('sinter');
            const model = await vscode.window.showInputBox({
                prompt: 'Groq model name',
                placeHolder: 'openai/gpt-oss-120b',
                value: config.get<string>('groqModel', 'openai/gpt-oss-120b'),
            });
            if (!model) { return; }
            await config.update('groqModel', model, true);
            await rebuildRuntime(true);
        }),

        vscode.commands.registerCommand('sinter.checkOnline', async () => {
            await checkGroqOnline(runtime);
            await rebuildRuntime(false);
        }),

        vscode.commands.registerCommand('sinter.takeScreenshot', async () => {
            const result = await tools.execute('computer_screenshot', {});
            vscode.window.showInformationMessage(result.output);
        }),

        vscode.commands.registerCommand('sinter.computerUse', () => setMode(agent, chatProvider, 'computer')),
        vscode.commands.registerCommand('sinter.agentMode', () => setMode(agent, chatProvider, 'agent')),
        vscode.commands.registerCommand('sinter.maxMode', () => setMode(agent, chatProvider, 'max')),
        vscode.commands.registerCommand('sinter.deepMode', () => setMode(agent, chatProvider, 'deep')),

        vscode.commands.registerCommand('sinter.sendFileToAgent', () => sendActiveFileToAgent(agent, chatProvider)),
        vscode.commands.registerCommand('sinter.fixProblems', () => sendDiagnosticsToAgent(agent, chatProvider)),

        vscode.commands.registerCommand('sinter.debugOllama', async () => {
            const url = vscode.workspace.getConfiguration('sinter').get<string>('ollamaUrl', 'http://localhost:11434');
            const client = new OllamaClient(url);
            try {
                const running = await client.isRunning();
                if (running) {
                    const models = await client.listModels();
                    vscode.window.showInformationMessage(`Ollama is ONLINE at ${url}. Found ${models.length} models.`);
                } else {
                    vscode.window.showErrorMessage(`Ollama is OFFLINE at ${url}. Please check if it is running.`);
                }
            } catch (e) {
                vscode.window.showErrorMessage(`Ollama Error at ${url}: ${(e as Error).message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (
                event.affectsConfiguration('sinter.activeModel') ||
                event.affectsConfiguration('sinter.localDefaultModel') ||
                event.affectsConfiguration('sinter.groqApiKeys') ||
                event.affectsConfiguration('sinter.groqModel') ||
                event.affectsConfiguration('sinter.groqBaseUrl') ||
                event.affectsConfiguration('sinter.use120BMode') ||
                event.affectsConfiguration('sinter.runtimeRouteMode') ||
                event.affectsConfiguration('sinter.selectedRuntimeModel') ||
                event.affectsConfiguration('sinter.validationEnabled')
            ) {
                await rebuildRuntime(true);
            }
            if (event.affectsConfiguration('sinter.systemPrompt')) {
                agent.setSystemPrompt(vscode.workspace.getConfiguration('sinter').get<string>('systemPrompt', ''));
            }
            if (event.affectsConfiguration('sinter.defaultMode')) {
                agent.setMode(vscode.workspace.getConfiguration('sinter').get<AgentMode>('defaultMode', 'chat'));
                chatProvider.sendRuntimeStatus();
            }
        })
    );

    // Background tasks
    setTimeout(() => {
        new OllamaClient(vscode.workspace.getConfiguration('sinter').get<string>('ollamaUrl', 'http://localhost:11434'))
            .isRunning()
            .then((running) => {
                if (!running) {
                    vscode.window.showWarningMessage('Ollama is not running', 'Start Ollama').then((action) => {
                        if (action === 'Start Ollama') {
                            const terminal = vscode.window.createTerminal('Ollama');
                            terminal.sendText('ollama serve');
                            terminal.show();
                        }
                    });
                }
            });

        const userContext = memory.getUserContext();
        if (!userContext.recentProjects.includes(workspaceRoot)) {
            memory.updateUserContext({ recentProjects: [...userContext.recentProjects, workspaceRoot].slice(-5) });
        }

        updateStatusBar(statusBar, runtime);
        rebuildRuntime(true);
    }, 100);

    log(`Sinter AI activated with ${tools.getAll().length} tools`);
    } catch (e) {
        log(`FATAL ACTIVATION ERROR: ${e}`);
        if (e instanceof Error) log(e.stack || '');
        vscode.window.showErrorMessage(`Sinter AI failed to activate: ${e}`);
    }
}

export function deactivate() {
    console.log('Sinter AI deactivated');
}

function readRuntimeConfig(): HybridRuntimeConfig {
    const config = vscode.workspace.getConfiguration('sinter');
    const localDefault = config.get<string>('localDefaultModel', 'deepseek-coder:6.7b');
    const activeModel = config.get<string>('activeModel', localDefault) || localDefault;
    const use120B = config.get<boolean>('use120BMode', false);
    const routeMode = config.get<RuntimeRouteMode>('runtimeRouteMode', use120B ? 'cloud-120b' : 'local');
    return {
        localModel: config.get<string>('localDefaultModel', activeModel) || activeModel,
        cloudModel: config.get<string>('groqModel', 'openai/gpt-oss-120b'),
        ollamaUrl: config.get<string>('ollamaUrl', 'http://localhost:11434'),
        groqBaseUrl: config.get<string>('groqBaseUrl', 'https://api.groq.com/openai'),
        groqApiKeys: config.get<GroqApiKey[]>('groqApiKeys', []),
        temperature: config.get<number>('temperature', 0.7),
        maxTokens: config.get<number>('maxTokens', 8192),
        routeMode,
        selectedModelId: config.get<string>('selectedRuntimeModel', '') || undefined,
        cloud120BEnabled: use120B,
    };
}

function loadConfiguredProviders(registry: ModelRegistry): void {
    const config = vscode.workspace.getConfiguration('sinter');
    const providers = config.get<ModelProvider[]>('modelProviders', []);
    if (providers.length > 0) {
        registry.loadFromSettings(providers);
    }

    const groqKeys = config.get<GroqApiKey[]>('groqApiKeys', []);
    registry.addProvider({
        id: 'groq',
        name: 'Groq Cloud',
        baseUrl: config.get<string>('groqBaseUrl', 'https://api.groq.com/openai'),
        type: 'groq',
        apiKeys: groqKeys,
        model: config.get<string>('groqModel', 'openai/gpt-oss-120b'),
        priority: 1,
        enabled: groqKeys.some((key) => key.enabled),
    });
}

async function selectRuntimeModel(runtime: HybridModelRuntime, registry: ModelRegistry): Promise<void> {
    try {
        runtime.setDiscoveredModels(await registry.discoverAll());
    } catch {
        // Built-in descriptors are enough when discovery fails.
    }

    const items = runtime.getModelDescriptors().map((model) => ({
        label: model.displayName,
        description: `${model.location.toUpperCase()} | ${model.roles.join(', ')} | ${formatContext(model.contextWindow)}`,
        detail: `${model.name} - tools: ${model.supportsTools ? 'yes' : 'fallback'} - vision: ${model.supportsVision ? 'yes' : 'no'}`,
        model,
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select Sinter runtime model',
        matchOnDescription: true,
        matchOnDetail: true,
    });
    if (!selected) {
        return;
    }

    runtime.setSelectedModel(selected.model.id);
    const config = vscode.workspace.getConfiguration('sinter');
    await config.update('selectedRuntimeModel', selected.model.id, true);
    await config.update('use120BMode', selected.model.location === 'cloud', true);
    await config.update('runtimeRouteMode', selected.model.location === 'cloud' ? 'cloud-120b' : 'local', true);
    if (selected.model.location === 'local') {
        await config.update('localDefaultModel', selected.model.name, true);
        await config.update('activeModel', selected.model.name, true);
    } else {
        await config.update('groqModel', selected.model.name, true);
    }
}

async function manageGroqKeys(): Promise<void> {
    const config = vscode.workspace.getConfiguration('sinter');
    const keys = config.get<GroqApiKey[]>('groqApiKeys', []);
    if (keys.length === 0) {
        const action = await vscode.window.showInformationMessage('No Groq API keys configured.', 'Add Key');
        if (action === 'Add Key') {
            await vscode.commands.executeCommand('sinter.addGroqKey');
        }
        return;
    }

    const items = keys.map((key, index) => ({
        label: `${key.enabled ? 'Enabled' : 'Disabled'} - ${key.label || `Key #${index + 1}`}`,
        description: `${key.key.slice(0, 8)}...${key.key.slice(-4)}`,
        index,
    }));

    const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Manage Groq API keys' });
    if (!selected) {
        return;
    }

    const action = await vscode.window.showQuickPick(
        [
            { label: keys[selected.index].enabled ? 'Disable' : 'Enable', value: 'toggle' },
            { label: 'Delete', value: 'delete' },
        ],
        { placeHolder: `Action for ${keys[selected.index].label}` }
    );
    if (!action) {
        return;
    }

    const updated = [...keys];
    if (action.value === 'toggle') {
        updated[selected.index].enabled = !updated[selected.index].enabled;
    } else {
        updated.splice(selected.index, 1);
    }
    await config.update('groqApiKeys', updated, true);
}

async function checkGroqOnline(runtime: HybridModelRuntime): Promise<void> {
    const runtimeConfig = runtime.getConfig();
    if (!runtimeConfig.groqApiKeys.some((key) => key.enabled)) {
        vscode.window.showInformationMessage('Sinter is offline/local: no enabled Groq keys.');
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Checking Groq cloud route...',
    }, async () => {
        const client = new GroqClient({
            baseUrl: runtimeConfig.groqBaseUrl,
            apiKeys: runtimeConfig.groqApiKeys,
            defaultModel: runtimeConfig.cloudModel,
            maxTokens: runtimeConfig.maxTokens,
            temperature: runtimeConfig.temperature,
        });
        const reachable = await client.isReachable();
        if (reachable) {
            vscode.window.showInformationMessage('Groq cloud route is online.');
        } else {
            vscode.window.showWarningMessage('Groq route is unavailable. Sinter will fall back to local Ollama.');
        }
    });
}

function setMode(agent: AgentLoop, chatProvider: ChatPanelProvider, mode: AgentMode): void {
    agent.setMode(mode);
    chatProvider.postMessage({ type: 'agentEvent', event: { type: 'info', content: `${mode} mode` } });
    chatProvider.sendRuntimeStatus();
}

function sendActiveFileToAgent(agent: AgentLoop, chatProvider: ChatPanelProvider): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No file open');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    const fileName = path.basename(filePath);
    const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const relativePath = wsRoot ? path.relative(wsRoot, filePath).replace(/\\/g, '/') : filePath;
    const selection = editor.selection;
    const cursorLine = selection.active.line + 1;
    const cursorCol = selection.active.character + 1;
    const totalLines = editor.document.lineCount;
    const lang = editor.document.languageId;

    // Build numbered content with smart truncation for large files
    let numberedContent: string;
    let preview: string;

    if (!selection.isEmpty) {
        // User selected specific text — send only the selection with line numbers
        const startLine = selection.start.line;
        const endLine = selection.end.line;
        const lines = editor.document.getText().split('\n');
        numberedContent = lines
            .slice(startLine, endLine + 1)
            .map((line, i) => `${startLine + i + 1}: ${line}`)
            .join('\n');
        preview = `Lines ${startLine + 1}-${endLine + 1} selected`;
    } else if (totalLines > 200) {
        // Large file — send ±50 lines around cursor
        const lines = editor.document.getText().split('\n');
        const windowStart = Math.max(0, cursorLine - 51);
        const windowEnd = Math.min(lines.length, cursorLine + 50);
        numberedContent = lines
            .slice(windowStart, windowEnd)
            .map((line, i) => `${windowStart + i + 1}: ${line}`)
            .join('\n');
        if (windowStart > 0) {
            numberedContent = `... (lines 1-${windowStart} hidden)\n` + numberedContent;
        }
        if (windowEnd < lines.length) {
            numberedContent += `\n... (lines ${windowEnd + 1}-${lines.length} hidden)`;
        }
        preview = `${totalLines} lines (showing around cursor line ${cursorLine})`;
    } else {
        // Small file — send entire file with line numbers
        const lines = editor.document.getText().split('\n');
        numberedContent = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
        preview = `${totalLines} lines`;
    }

    const contextBlock = [
        `File: ${relativePath}`,
        `Language: ${lang} | Total: ${totalLines} lines | Cursor: line ${cursorLine}, col ${cursorCol}`,
        !selection.isEmpty ? `Selected: lines ${selection.start.line + 1}-${selection.end.line + 1}` : '',
        '',
        '```' + lang,
        numberedContent.substring(0, 12000),
        '```',
    ].filter(Boolean).join('\n');

    agent.setActiveFile(filePath, editor.document.getText());
    vscode.commands.executeCommand('sinter.chatPanel.focus');
    chatProvider.postMessage({
        type: 'injectContext',
        fileName: `${fileName} (line ${cursorLine})`,
        preview,
        content: contextBlock,
    });
    chatProvider.sendRuntimeStatus();
}

function sendDiagnosticsToAgent(agent: AgentLoop, chatProvider: ChatPanelProvider): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No file open');
        return;
    }

    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri)
        .filter((diagnostic) => diagnostic.severity <= vscode.DiagnosticSeverity.Warning)
        .slice(0, 20);

    if (diagnostics.length === 0) {
        vscode.window.showInformationMessage('No problems found in this file');
        return;
    }

    const fileName = path.basename(editor.document.uri.fsPath);
    const problems = diagnostics
        .map((diagnostic) => `Line ${diagnostic.range.start.line + 1}: ${diagnostic.message}`)
        .join('\n');

    agent.setActiveFile(editor.document.uri.fsPath, editor.document.getText());
    vscode.commands.executeCommand('sinter.chatPanel.focus');
    chatProvider.sendPrefilled(`Fix these problems in ${fileName}:\n\n${problems}`, 'debug');
}

function updateStatusBar(statusBar: vscode.StatusBarItem, runtime: HybridModelRuntime): void {
    const status = runtime.snapshot();
    const route = status.location === 'cloud' ? 'Cloud 120B' : 'Local';
    statusBar.text = `$(zap) Sinter ${route}: ${status.activeModel}`;
    statusBar.tooltip = [
        `Provider: ${status.activeProvider}`,
        `Route: ${status.routeMode}`,
        `Context: ${formatContext(status.contextWindow)}`,
        `Fallback: ${status.fallbackModel}`,
        'Click to select model',
    ].join('\n');
}

function formatContext(tokens: number): string {
    return tokens >= 1000 ? `${Math.round(tokens / 1000)}k ctx` : `${tokens} ctx`;
}
