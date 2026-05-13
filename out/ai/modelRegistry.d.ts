export interface ModelProvider {
    id: string;
    name: string;
    baseUrl: string;
    type: 'ollama' | 'openai-compatible' | 'groq';
    apiKey?: string;
    apiKeys?: {
        key: string;
        label: string;
        enabled: boolean;
    }[];
    model?: string;
    priority?: number;
    enabled: boolean;
}
export interface ModelCapabilities {
    supportsTools: boolean;
    supportsVision: boolean;
    supportsStreaming: boolean;
    modelFamily: string;
}
export interface RegisteredModel {
    id: string;
    name: string;
    displayName: string;
    isOnline?: boolean;
    provider: string;
    providerType: 'ollama' | 'openai-compatible' | 'groq';
    size?: number;
    capabilities: ModelCapabilities;
}
export declare class ModelRegistry {
    private providers;
    private models;
    private discoveryCache;
    constructor();
    updateOllamaProvider(baseUrl: string): void;
    addProvider(provider: ModelProvider): void;
    removeProvider(id: string): void;
    getProvider(id: string): ModelProvider | undefined;
    getAllProviders(): ModelProvider[];
    /** Load providers from VS Code settings */
    loadFromSettings(settingsProviders: ModelProvider[]): void;
    /** Discover all models from all providers */
    discoverAll(): Promise<RegisteredModel[]>;
    /** Discover models from a specific provider */
    discoverFromProvider(provider: ModelProvider): Promise<RegisteredModel[]>;
    private discoverOllamaModels;
    private discoverOllamaModelsFromCli;
    private discoverOpenAIModels;
    private discoverGroqModels;
    registerModel(model: RegisteredModel): void;
    getModel(id: string): RegisteredModel | undefined;
    /** Get model by name (searches across providers) */
    findByName(name: string): RegisteredModel | undefined;
    getAllModels(): RegisteredModel[];
    getModelsByProvider(providerId: string): RegisteredModel[];
    detectCapabilities(modelName: string): ModelCapabilities;
    private extractFamily;
    private createRegisteredModel;
    private formatDisplayName;
    private httpGet;
    clearCache(): void;
}
