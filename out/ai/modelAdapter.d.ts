import { OllamaClient, OllamaMessage, OllamaTool } from './ollamaClient';
import { GroqClient, GroqProviderConfig } from './groqClient';
export interface ModelCapabilities {
    supportsTools: boolean;
    supportsVision: boolean;
    modelFamily: string;
    rawName: string;
}
export interface ParsedToolCall {
    name: string;
    arguments: Record<string, unknown>;
}
export interface AdaptedResponse {
    content: string;
    toolCalls: ParsedToolCall[];
    isToolResponse: boolean;
    providerUsed?: string;
    modelUsed?: string;
    isOnline?: boolean;
}
export interface ProviderEntry {
    id: string;
    name: string;
    type: 'ollama' | 'groq' | 'openai-compatible';
    priority: number;
    enabled: boolean;
    ollamaUrl?: string;
    ollamaModel?: string;
    groqConfig?: GroqProviderConfig;
}
export declare class ModelAdapter {
    private client;
    private groqClient;
    private capabilitiesCache;
    private providerChain;
    private lastProviderUsed;
    private lastModelUsed;
    private isOnline;
    constructor(client: OllamaClient);
    setProviderChain(chain: ProviderEntry[]): void;
    getProviderChain(): ProviderEntry[];
    getLastProviderUsed(): string;
    getLastModelUsed(): string;
    getIsOnline(): boolean;
    getGroqClient(): GroqClient | null;
    getCapabilities(modelName: string): ModelCapabilities;
    chatWithFallback(model: string, messages: OllamaMessage[], tools: OllamaTool[], options?: Record<string, unknown>, onFallback?: (message: string) => void): Promise<AdaptedResponse>;
    private chatWithGroq;
    chat(model: string, messages: OllamaMessage[], tools: OllamaTool[], options?: Record<string, unknown>): Promise<AdaptedResponse>;
    private buildToolPrompt;
    private injectToolPrompt;
    private parseToolCallsFromText;
    /**
     * Extract JSON blocks from text using brace-balancing.
     * Handles nested braces correctly, unlike the old regex approach.
     */
    private extractJsonBlocks;
    private removeToolJson;
    private extractFamily;
    clearCache(): void;
}
