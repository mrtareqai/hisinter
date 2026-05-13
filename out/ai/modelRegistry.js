"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Model Registry ⭐
// Dynamic model registration supporting Ollama + OpenAI-compatible
// No more hardcoded model lists!
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
exports.ModelRegistry = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const child_process_1 = require("child_process");
// ─── Known capabilities ─────────────────────────────────────
const TOOL_CAPABLE_FAMILIES = [
    'qwen', 'llama3', 'mistral', 'mixtral', 'command-r',
    'firefunction', 'hermes', 'gorilla', 'nexusraven', 'deepseek',
    'gpt-4', 'gpt-3.5', 'claude', 'gemini',
];
const VISION_FAMILIES = [
    'llava', 'bakllava', 'moondream', 'gpt-4-vision', 'gpt-4o',
];
// ─── Registry ───────────────────────────────────────────────
class ModelRegistry {
    providers = new Map();
    models = new Map();
    discoveryCache = new Map(); // provider → timestamp
    constructor() {
        this.updateOllamaProvider('http://localhost:11434');
    }
    updateOllamaProvider(baseUrl) {
        this.addProvider({
            id: 'ollama',
            name: 'Ollama Local',
            baseUrl: baseUrl,
            type: 'ollama',
            enabled: true,
        });
    }
    // ─── Provider Management ────────────────────────────────
    addProvider(provider) {
        this.providers.set(provider.id, provider);
    }
    removeProvider(id) {
        this.providers.delete(id);
        // Remove all models from this provider
        for (const [modelId, model] of this.models) {
            if (model.provider === id) {
                this.models.delete(modelId);
            }
        }
    }
    getProvider(id) {
        return this.providers.get(id);
    }
    getAllProviders() {
        return Array.from(this.providers.values());
    }
    /** Load providers from VS Code settings */
    loadFromSettings(settingsProviders) {
        // Keep default ollama, add/update others
        for (const p of settingsProviders) {
            this.addProvider({ ...p, enabled: p.enabled !== false });
        }
    }
    // ─── Model Discovery ────────────────────────────────────
    /** Discover all models from all providers */
    async discoverAll() {
        const allModels = [];
        for (const provider of this.providers.values()) {
            if (!provider.enabled) {
                continue;
            }
            try {
                const models = await this.discoverFromProvider(provider);
                allModels.push(...models);
            }
            catch (e) {
                console.error(`[Sinter AI] Failed to discover models from ${provider.name} (${provider.baseUrl}):`, e);
            }
        }
        return allModels;
    }
    /** Discover models from a specific provider */
    async discoverFromProvider(provider) {
        if (provider.type === 'ollama') {
            return this.discoverOllamaModels(provider);
        }
        else if (provider.type === 'groq') {
            return this.discoverGroqModels(provider);
        }
        else {
            return this.discoverOpenAIModels(provider);
        }
    }
    async discoverOllamaModels(provider) {
        try {
            const data = await this.httpGet(`${provider.baseUrl}/api/tags`);
            const parsed = JSON.parse(data);
            const models = [];
            for (const m of (parsed.models || [])) {
                const model = this.createRegisteredModel(m.name, provider, m.size, m.details);
                this.models.set(model.id, model);
                models.push(model);
            }
            this.discoveryCache.set(provider.id, Date.now());
            return models;
        }
        catch {
            return this.discoverOllamaModelsFromCli(provider);
        }
    }
    discoverOllamaModelsFromCli(provider) {
        try {
            const output = (0, child_process_1.execFileSync)('ollama', ['list'], { encoding: 'utf8', timeout: 5000 });
            const models = [];
            const lines = output.split(/\r?\n/).slice(1);
            for (const line of lines) {
                const name = line.trim().split(/\s+/)[0];
                if (!name || name.toLowerCase() === 'name') {
                    continue;
                }
                const model = this.createRegisteredModel(name, provider, 0);
                this.models.set(model.id, model);
                models.push(model);
            }
            this.discoveryCache.set(provider.id, Date.now());
            return models;
        }
        catch {
            return [];
        }
    }
    async discoverOpenAIModels(provider) {
        try {
            const headers = {};
            if (provider.apiKey) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            }
            const data = await this.httpGet(`${provider.baseUrl}/v1/models`, headers);
            const parsed = JSON.parse(data);
            const models = [];
            for (const m of (parsed.data || [])) {
                const model = {
                    id: `${provider.id}/${m.id}`,
                    name: m.id,
                    displayName: m.id,
                    provider: provider.id,
                    providerType: 'openai-compatible',
                    capabilities: this.detectCapabilities(m.id),
                };
                this.models.set(model.id, model);
                models.push(model);
            }
            this.discoveryCache.set(provider.id, Date.now());
            return models;
        }
        catch {
            return [];
        }
    }
    async discoverGroqModels(provider) {
        // For Groq, we register the configured model directly
        // (Groq models are known, no need for full /v1/models discovery)
        const models = [];
        const modelName = provider.model || 'openai/gpt-oss-120b';
        const model = {
            id: `${provider.id}/${modelName}`,
            name: modelName,
            displayName: this.formatDisplayName(modelName),
            provider: provider.id,
            providerType: 'groq',
            isOnline: true,
            capabilities: this.detectCapabilities(modelName),
        };
        this.models.set(model.id, model);
        models.push(model);
        // Also try fetching available models from Groq API
        try {
            const apiKey = provider.apiKey || provider.apiKeys?.[0]?.key;
            if (apiKey) {
                const headers = {
                    'Authorization': `Bearer ${apiKey}`,
                };
                const data = await this.httpGet(`${provider.baseUrl}/v1/models`, headers);
                const parsed = JSON.parse(data);
                for (const m of (parsed.data || []).slice(0, 10)) {
                    if (m.id === modelName) {
                        continue;
                    } // skip duplicate
                    const rm = {
                        id: `${provider.id}/${m.id}`,
                        name: m.id,
                        displayName: this.formatDisplayName(m.id),
                        provider: provider.id,
                        providerType: 'groq',
                        isOnline: true,
                        capabilities: this.detectCapabilities(m.id),
                    };
                    this.models.set(rm.id, rm);
                    models.push(rm);
                }
            }
        }
        catch {
            // Groq API not reachable, just use configured model
        }
        this.discoveryCache.set(provider.id, Date.now());
        return models;
    }
    // ─── Model Access ───────────────────────────────────────
    registerModel(model) {
        this.models.set(model.id, model);
    }
    getModel(id) {
        return this.models.get(id);
    }
    /** Get model by name (searches across providers) */
    findByName(name) {
        for (const model of this.models.values()) {
            if (model.name === name || model.id === name) {
                return model;
            }
        }
        return undefined;
    }
    getAllModels() {
        return Array.from(this.models.values());
    }
    getModelsByProvider(providerId) {
        return Array.from(this.models.values()).filter(m => m.provider === providerId);
    }
    // ─── Capabilities ───────────────────────────────────────
    detectCapabilities(modelName) {
        const lower = modelName.toLowerCase();
        const family = this.extractFamily(lower);
        return {
            supportsTools: TOOL_CAPABLE_FAMILIES.some(f => lower.includes(f)),
            supportsVision: VISION_FAMILIES.some(f => lower.includes(f)),
            supportsStreaming: true,
            modelFamily: family,
        };
    }
    extractFamily(name) {
        const families = [
            'gpt-4', 'gpt-3.5', 'claude', 'gemini',
            'phi3', 'phi', 'qwen', 'llama', 'mistral', 'gemma',
            'codellama', 'deepseek', 'vicuna', 'llava', 'command-r',
        ];
        for (const f of families) {
            if (name.includes(f)) {
                return f;
            }
        }
        return 'unknown';
    }
    // ─── Helpers ─────────────────────────────────────────────
    createRegisteredModel(name, provider, size, details) {
        return {
            id: `${provider.id}/${name}`,
            name,
            displayName: this.formatDisplayName(name),
            provider: provider.id,
            providerType: provider.type,
            size,
            capabilities: this.detectCapabilities(name),
        };
    }
    formatDisplayName(name) {
        return name
            .replace(/:latest$/, '')
            .replace(/-/, ' ')
            .split(/[:/]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
    httpGet(url, headers) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const lib = urlObj.protocol === 'https:' ? https : http;
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: { ...headers },
            };
            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            });
            req.on('error', reject);
            req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
            req.end();
        });
    }
    clearCache() {
        this.models.clear();
        this.discoveryCache.clear();
    }
}
exports.ModelRegistry = ModelRegistry;
//# sourceMappingURL=modelRegistry.js.map