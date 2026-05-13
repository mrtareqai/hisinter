// ═══════════════════════════════════════════════════════════════
// Sinter AI — Model Registry ⭐
// Dynamic model registration supporting Ollama + OpenAI-compatible
// No more hardcoded model lists!
// ═══════════════════════════════════════════════════════════════

import * as http from 'http';
import * as https from 'https';
import { execFileSync } from 'child_process';

// ─── Types ──────────────────────────────────────────────────

export interface ModelProvider {
    id: string;
    name: string;
    baseUrl: string;
    type: 'ollama' | 'openai-compatible' | 'groq';
    apiKey?: string;
    apiKeys?: { key: string; label: string; enabled: boolean }[];
    model?: string;       // default model for this provider
    priority?: number;    // lower = higher priority in fallback chain
    enabled: boolean;
}

export interface ModelCapabilities {
    supportsTools: boolean;
    supportsVision: boolean;
    supportsStreaming: boolean;
    modelFamily: string;
}

export interface RegisteredModel {
    id: string;               // e.g., 'ollama/qwen2.5:7b'
    name: string;             // e.g., 'qwen2.5:7b'
    displayName: string;      // e.g., 'Qwen 2.5 7B'
    isOnline?: boolean;       // true if cloud provider (Groq, etc.)
    provider: string;         // provider id
    providerType: 'ollama' | 'openai-compatible' | 'groq';
    size?: number;
    capabilities: ModelCapabilities;
}

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

export class ModelRegistry {
    private providers: Map<string, ModelProvider> = new Map();
    private models: Map<string, RegisteredModel> = new Map();
    private discoveryCache: Map<string, number> = new Map(); // provider → timestamp

    constructor() {
        this.updateOllamaProvider('http://localhost:11434');
    }

    updateOllamaProvider(baseUrl: string): void {
        this.addProvider({
            id: 'ollama',
            name: 'Ollama Local',
            baseUrl: baseUrl,
            type: 'ollama',
            enabled: true,
        });
    }

    // ─── Provider Management ────────────────────────────────

    addProvider(provider: ModelProvider): void {
        this.providers.set(provider.id, provider);
    }

    removeProvider(id: string): void {
        this.providers.delete(id);
        // Remove all models from this provider
        for (const [modelId, model] of this.models) {
            if (model.provider === id) {
                this.models.delete(modelId);
            }
        }
    }

    getProvider(id: string): ModelProvider | undefined {
        return this.providers.get(id);
    }

    getAllProviders(): ModelProvider[] {
        return Array.from(this.providers.values());
    }

    /** Load providers from VS Code settings */
    loadFromSettings(settingsProviders: ModelProvider[]): void {
        // Keep default ollama, add/update others
        for (const p of settingsProviders) {
            this.addProvider({ ...p, enabled: p.enabled !== false });
        }
    }

    // ─── Model Discovery ────────────────────────────────────

    /** Discover all models from all providers */
    async discoverAll(): Promise<RegisteredModel[]> {
        const allModels: RegisteredModel[] = [];

        for (const provider of this.providers.values()) {
            if (!provider.enabled) { continue; }

            try {
                const models = await this.discoverFromProvider(provider);
                allModels.push(...models);
            } catch (e) {
                console.error(`[Sinter AI] Failed to discover models from ${provider.name} (${provider.baseUrl}):`, e);
            }
        }

        return allModels;
    }

    /** Discover models from a specific provider */
    async discoverFromProvider(provider: ModelProvider): Promise<RegisteredModel[]> {
        if (provider.type === 'ollama') {
            return this.discoverOllamaModels(provider);
        } else if (provider.type === 'groq') {
            return this.discoverGroqModels(provider);
        } else {
            return this.discoverOpenAIModels(provider);
        }
    }

    private async discoverOllamaModels(provider: ModelProvider): Promise<RegisteredModel[]> {
        try {
            const data = await this.httpGet(`${provider.baseUrl}/api/tags`);
            const parsed = JSON.parse(data);
            const models: RegisteredModel[] = [];

            for (const m of (parsed.models || [])) {
                const model = this.createRegisteredModel(m.name, provider, m.size, m.details);
                this.models.set(model.id, model);
                models.push(model);
            }

            this.discoveryCache.set(provider.id, Date.now());
            return models;
        } catch {
            return this.discoverOllamaModelsFromCli(provider);
        }
    }

    private discoverOllamaModelsFromCli(provider: ModelProvider): RegisteredModel[] {
        try {
            const output = execFileSync('ollama', ['list'], { encoding: 'utf8', timeout: 5000 });
            const models: RegisteredModel[] = [];
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
        } catch {
            return [];
        }
    }

    private async discoverOpenAIModels(provider: ModelProvider): Promise<RegisteredModel[]> {
        try {
            const headers: Record<string, string> = {};
            if (provider.apiKey) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            }

            const data = await this.httpGet(`${provider.baseUrl}/v1/models`, headers);
            const parsed = JSON.parse(data);
            const models: RegisteredModel[] = [];

            for (const m of (parsed.data || [])) {
                const model: RegisteredModel = {
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
        } catch {
            return [];
        }
    }

    private async discoverGroqModels(provider: ModelProvider): Promise<RegisteredModel[]> {
        // For Groq, we register the configured model directly
        // (Groq models are known, no need for full /v1/models discovery)
        const models: RegisteredModel[] = [];
        const modelName = provider.model || 'openai/gpt-oss-120b';
        const model: RegisteredModel = {
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
                const headers: Record<string, string> = {
                    'Authorization': `Bearer ${apiKey}`,
                };
                const data = await this.httpGet(`${provider.baseUrl}/v1/models`, headers);
                const parsed = JSON.parse(data);
                for (const m of (parsed.data || []).slice(0, 10)) {
                    if (m.id === modelName) { continue; } // skip duplicate
                    const rm: RegisteredModel = {
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
        } catch {
            // Groq API not reachable, just use configured model
        }

        this.discoveryCache.set(provider.id, Date.now());
        return models;
    }

    // ─── Model Access ───────────────────────────────────────

    registerModel(model: RegisteredModel): void {
        this.models.set(model.id, model);
    }

    getModel(id: string): RegisteredModel | undefined {
        return this.models.get(id);
    }

    /** Get model by name (searches across providers) */
    findByName(name: string): RegisteredModel | undefined {
        for (const model of this.models.values()) {
            if (model.name === name || model.id === name) {
                return model;
            }
        }
        return undefined;
    }

    getAllModels(): RegisteredModel[] {
        return Array.from(this.models.values());
    }

    getModelsByProvider(providerId: string): RegisteredModel[] {
        return Array.from(this.models.values()).filter(m => m.provider === providerId);
    }

    // ─── Capabilities ───────────────────────────────────────

    detectCapabilities(modelName: string): ModelCapabilities {
        const lower = modelName.toLowerCase();
        const family = this.extractFamily(lower);

        return {
            supportsTools: TOOL_CAPABLE_FAMILIES.some(f => lower.includes(f)),
            supportsVision: VISION_FAMILIES.some(f => lower.includes(f)),
            supportsStreaming: true,
            modelFamily: family,
        };
    }

    private extractFamily(name: string): string {
        const families = [
            'gpt-4', 'gpt-3.5', 'claude', 'gemini',
            'phi3', 'phi', 'qwen', 'llama', 'mistral', 'gemma',
            'codellama', 'deepseek', 'vicuna', 'llava', 'command-r',
        ];
        for (const f of families) {
            if (name.includes(f)) { return f; }
        }
        return 'unknown';
    }

    // ─── Helpers ─────────────────────────────────────────────

    private createRegisteredModel(
        name: string,
        provider: ModelProvider,
        size?: number,
        details?: { parameter_size?: string; family?: string }
    ): RegisteredModel {
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

    private formatDisplayName(name: string): string {
        return name
            .replace(/:latest$/, '')
            .replace(/-/, ' ')
            .split(/[:/]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    private httpGet(url: string, headers?: Record<string, string>): Promise<string> {
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

    clearCache(): void {
        this.models.clear();
        this.discoveryCache.clear();
    }
}
