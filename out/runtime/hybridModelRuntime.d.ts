import { ProviderEntry } from '../ai/modelAdapter';
import { GroqApiKey } from '../ai/groqClient';
import { RegisteredModel } from '../ai/modelRegistry';
export type RuntimeRouteMode = 'local' | 'cloud-120b' | 'hybrid-auto';
export type RuntimeLocation = 'local' | 'cloud';
export type RuntimeExecutionState = 'idle' | 'planning' | 'executing' | 'validating' | 'reflecting' | 'retrying' | 'completed' | 'failed' | 'paused';
export interface RuntimeModelDescriptor {
    id: string;
    name: string;
    displayName: string;
    providerId: string;
    providerName: string;
    location: RuntimeLocation;
    roles: string[];
    contextWindow: number;
    supportsTools: boolean;
    supportsVision: boolean;
    supportsStreaming: boolean;
    isSelected: boolean;
    isDefaultLocal: boolean;
    is120B: boolean;
}
export interface HybridRuntimeConfig {
    localModel: string;
    cloudModel: string;
    ollamaUrl: string;
    groqBaseUrl: string;
    groqApiKeys: GroqApiKey[];
    temperature: number;
    maxTokens: number;
    routeMode: RuntimeRouteMode;
    selectedModelId?: string;
    cloud120BEnabled: boolean;
}
export interface RuntimeStatusSnapshot {
    activeModel: string;
    activeProvider: string;
    location: RuntimeLocation;
    routeMode: RuntimeRouteMode;
    cloud120BEnabled: boolean;
    selectedModelId: string;
    fallbackModel: string;
    contextWindow: number;
    memoryMb: number;
    taskCount: number;
    goalProgress: number;
    executionState: RuntimeExecutionState;
    agentState: string;
    toolState: string;
    tokenPolicy: string;
    tokensUsed: number | null;
    validationState: string;
    modelDescriptors: RuntimeModelDescriptor[];
}
export declare class HybridModelRuntime {
    private config;
    private discoveredModels;
    constructor(config: HybridRuntimeConfig);
    update(config: Partial<HybridRuntimeConfig>): void;
    getConfig(): HybridRuntimeConfig;
    set120BMode(enabled: boolean): void;
    setSelectedModel(modelId: string): void;
    getActiveSelection(modeHint?: string): {
        model: string;
        provider: string;
        location: RuntimeLocation;
        contextWindow: number;
    };
    buildProviderChain(modeHint?: string): ProviderEntry[];
    setDiscoveredModels(models: RegisteredModel[]): void;
    getModelDescriptors(): RuntimeModelDescriptor[];
    getActiveModelId(): string;
    snapshot(input?: Partial<Omit<RuntimeStatusSnapshot, 'activeModel' | 'activeProvider' | 'location' | 'routeMode' | 'cloud120BEnabled' | 'selectedModelId' | 'fallbackModel' | 'contextWindow' | 'memoryMb' | 'tokenPolicy' | 'modelDescriptors'>>): RuntimeStatusSnapshot;
    private buildGroqProvider;
    private hasCloudKeys;
    private isHeavyMode;
    private getBuiltInModels;
    private fromRegisteredModel;
    private detectRoles;
    private supportsTools;
    private supportsVision;
    private estimateContextWindow;
    private is120BModel;
    private reconcileLocalSelectionWithInstalledModels;
    private localModelId;
    private cloudModelId;
}
