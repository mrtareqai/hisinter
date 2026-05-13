"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridModelRuntime = void 0;
class HybridModelRuntime {
    config;
    discoveredModels = [];
    constructor(config) {
        this.config = { ...config };
    }
    update(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config, groqApiKeys: [...this.config.groqApiKeys] };
    }
    set120BMode(enabled) {
        this.config.cloud120BEnabled = enabled;
        this.config.routeMode = enabled ? 'cloud-120b' : 'local';
        this.config.selectedModelId = enabled
            ? this.cloudModelId(this.config.cloudModel)
            : this.localModelId(this.config.localModel);
    }
    setSelectedModel(modelId) {
        this.config.selectedModelId = modelId;
        if (modelId.startsWith('groq/')) {
            this.config.cloud120BEnabled = true;
            this.config.routeMode = 'cloud-120b';
            this.config.cloudModel = modelId.slice('groq/'.length);
        }
        else if (modelId.startsWith('ollama/')) {
            this.config.cloud120BEnabled = false;
            this.config.routeMode = 'local';
            this.config.localModel = modelId.slice('ollama/'.length);
        }
    }
    getActiveSelection(modeHint) {
        const hasCloud = this.hasCloudKeys();
        const wantsCloud = (this.config.cloud120BEnabled && hasCloud) ||
            this.config.routeMode === 'cloud-120b' ||
            this.config.selectedModelId?.startsWith('groq/') ||
            (this.config.routeMode === 'hybrid-auto' && hasCloud && this.isHeavyMode(modeHint));
        if (wantsCloud && hasCloud) {
            return {
                model: this.config.cloudModel,
                provider: 'Groq Cloud',
                location: 'cloud',
                contextWindow: this.estimateContextWindow(this.config.cloudModel),
            };
        }
        return {
            model: this.config.localModel,
            provider: 'Ollama Local',
            location: 'local',
            contextWindow: this.estimateContextWindow(this.config.localModel),
        };
    }
    buildProviderChain(modeHint) {
        const selected = this.getActiveSelection(modeHint);
        const chain = [];
        const localProvider = {
            id: 'ollama',
            name: 'Ollama Local',
            type: 'ollama',
            priority: selected.location === 'local' ? 1 : 2,
            enabled: true,
            ollamaUrl: this.config.ollamaUrl,
            ollamaModel: this.config.localModel,
        };
        const groqProvider = this.buildGroqProvider(selected.location === 'cloud' ? 1 : 2);
        if (selected.location === 'cloud' && groqProvider) {
            chain.push(groqProvider, localProvider);
            return chain;
        }
        chain.push(localProvider);
        if (this.config.routeMode === 'hybrid-auto' && groqProvider) {
            chain.push(groqProvider);
        }
        return chain;
    }
    setDiscoveredModels(models) {
        const descriptors = models.map((m) => this.fromRegisteredModel(m));
        const byId = new Map();
        for (const descriptor of [...this.getBuiltInModels(), ...descriptors]) {
            byId.set(descriptor.id, descriptor);
        }
        this.discoveredModels = Array.from(byId.values());
        this.reconcileLocalSelectionWithInstalledModels(descriptors);
    }
    getModelDescriptors() {
        const models = this.discoveredModels.length > 0 ? this.discoveredModels : this.getBuiltInModels();
        const selectedId = this.config.selectedModelId || this.getActiveModelId();
        return models.map((m) => ({
            ...m,
            isSelected: m.id === selectedId || m.name === this.getActiveSelection().model,
        }));
    }
    getActiveModelId() {
        const active = this.getActiveSelection();
        return active.location === 'cloud'
            ? this.cloudModelId(active.model)
            : this.localModelId(active.model);
    }
    snapshot(input = {}) {
        const active = this.getActiveSelection(input.agentState);
        return {
            activeModel: active.model,
            activeProvider: active.provider,
            location: active.location,
            routeMode: this.config.routeMode,
            cloud120BEnabled: this.config.cloud120BEnabled,
            selectedModelId: this.config.selectedModelId || this.getActiveModelId(),
            fallbackModel: this.config.localModel,
            contextWindow: active.contextWindow,
            memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
            taskCount: input.taskCount ?? 0,
            goalProgress: input.goalProgress ?? 0,
            executionState: input.executionState ?? 'idle',
            agentState: input.agentState ?? 'ready',
            toolState: input.toolState ?? 'idle',
            tokenPolicy: active.location === 'local' ? 'local-unlimited' : `cloud-${this.config.maxTokens}`,
            tokensUsed: input.tokensUsed ?? null,
            validationState: input.validationState ?? 'not-run',
            modelDescriptors: this.getModelDescriptors(),
        };
    }
    buildGroqProvider(priority) {
        if (!this.hasCloudKeys()) {
            return null;
        }
        const groqConfig = {
            baseUrl: this.config.groqBaseUrl,
            apiKeys: this.config.groqApiKeys,
            defaultModel: this.config.cloudModel,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            topP: 1,
        };
        return {
            id: 'groq',
            name: 'Groq Cloud 120B',
            type: 'groq',
            priority,
            enabled: true,
            groqConfig,
        };
    }
    hasCloudKeys() {
        return this.config.groqApiKeys.some((key) => key.enabled);
    }
    isHeavyMode(modeHint) {
        return modeHint === 'agent' || modeHint === 'max' || modeHint === 'deep' || modeHint === 'planning' || modeHint === 'debug';
    }
    getBuiltInModels() {
        const activeId = this.config.selectedModelId || this.getActiveModelId();
        const local = this.localModelId(this.config.localModel);
        const cloud = this.cloudModelId(this.config.cloudModel);
        return [
            {
                id: local,
                name: this.config.localModel,
                displayName: this.config.localModel,
                providerId: 'ollama',
                providerName: 'Ollama Local',
                location: 'local',
                roles: ['coding', 'agent', 'offline'],
                contextWindow: this.estimateContextWindow(this.config.localModel),
                supportsTools: this.supportsTools(this.config.localModel),
                supportsVision: this.supportsVision(this.config.localModel),
                supportsStreaming: true,
                isSelected: activeId === local,
                isDefaultLocal: true,
                is120B: false,
            },
            {
                id: cloud,
                name: this.config.cloudModel,
                displayName: 'GPT OSS 120B',
                providerId: 'groq',
                providerName: 'Groq Cloud',
                location: 'cloud',
                roles: ['reasoning', 'coding', 'large-context'],
                contextWindow: this.estimateContextWindow(this.config.cloudModel),
                supportsTools: true,
                supportsVision: false,
                supportsStreaming: true,
                isSelected: activeId === cloud,
                isDefaultLocal: false,
                is120B: true,
            },
        ];
    }
    fromRegisteredModel(model) {
        const location = model.isOnline || model.providerType === 'groq' ? 'cloud' : 'local';
        const id = `${model.provider}/${model.name}`;
        return {
            id,
            name: model.name,
            displayName: model.displayName,
            providerId: model.provider,
            providerName: model.providerType === 'groq' ? 'Groq Cloud' : model.provider,
            location,
            roles: this.detectRoles(model.name, model.capabilities.supportsVision),
            contextWindow: this.estimateContextWindow(model.name),
            supportsTools: model.capabilities.supportsTools,
            supportsVision: model.capabilities.supportsVision,
            supportsStreaming: model.capabilities.supportsStreaming,
            isSelected: id === (this.config.selectedModelId || this.getActiveModelId()),
            isDefaultLocal: model.name === this.config.localModel && location === 'local',
            is120B: this.is120BModel(model.name),
        };
    }
    detectRoles(modelName, vision) {
        const lower = modelName.toLowerCase();
        const roles = new Set();
        if (lower.includes('coder') || lower.includes('code') || lower.includes('deepseek') || lower.includes('qwen')) {
            roles.add('coding');
        }
        if (lower.includes('gpt') || lower.includes('120b') || lower.includes('reason')) {
            roles.add('reasoning');
        }
        if (vision) {
            roles.add('vision');
        }
        roles.add(lower.includes('gpt') || lower.includes('groq') ? 'cloud' : 'local');
        return Array.from(roles);
    }
    supportsTools(modelName) {
        const lower = modelName.toLowerCase();
        return ['qwen', 'llama', 'mistral', 'deepseek', 'gpt', 'oss', 'hermes', 'command-r'].some((family) => lower.includes(family));
    }
    supportsVision(modelName) {
        const lower = modelName.toLowerCase();
        return ['llava', 'bakllava', 'moondream', 'vision', 'gpt-4o'].some((family) => lower.includes(family));
    }
    estimateContextWindow(modelName) {
        const lower = modelName.toLowerCase();
        if (lower.includes('120b') || lower.includes('gpt-oss')) {
            return 131072;
        }
        if (lower.includes('qwen') || lower.includes('llama3.3') || lower.includes('llama3.2')) {
            return 32768;
        }
        if (lower.includes('deepseek-coder')) {
            return 16384;
        }
        return 8192;
    }
    is120BModel(modelName) {
        const lower = modelName.toLowerCase();
        return lower.includes('120b') || lower.includes('gpt-oss');
    }
    reconcileLocalSelectionWithInstalledModels(discoveredDescriptors) {
        const localModels = discoveredDescriptors.filter((model) => model.location === 'local');
        if (localModels.length === 0) {
            return;
        }
        const configured = this.config.localModel.toLowerCase();
        const configuredExists = localModels.some((model) => model.name.toLowerCase() === configured || model.id.toLowerCase() === this.localModelId(this.config.localModel).toLowerCase());
        if (configuredExists) {
            return;
        }
        const preferred = localModels.find((model) => model.name.toLowerCase().includes('deepseek-coder')) ||
            localModels.find((model) => model.name.toLowerCase().includes('deepseek')) ||
            localModels.find((model) => model.name.toLowerCase().includes('qwen') && model.name.toLowerCase().includes('coder')) ||
            localModels[0];
        this.config.localModel = preferred.name;
        if (!this.config.selectedModelId || this.config.selectedModelId.startsWith('ollama/')) {
            this.config.selectedModelId = this.localModelId(preferred.name);
            this.config.cloud120BEnabled = false;
            this.config.routeMode = 'local';
        }
    }
    localModelId(model) {
        return `ollama/${model}`;
    }
    cloudModelId(model) {
        return `groq/${model}`;
    }
}
exports.HybridModelRuntime = HybridModelRuntime;
//# sourceMappingURL=hybridModelRuntime.js.map