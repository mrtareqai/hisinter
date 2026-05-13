export interface GroqMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: GroqToolCall[];
}
export interface GroqToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
export interface GroqTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}
export interface GroqChatRequest {
    model: string;
    messages: GroqMessage[];
    temperature?: number;
    max_completion_tokens?: number;
    top_p?: number;
    stream?: boolean;
    stop?: string | string[] | null;
    tools?: GroqTool[];
    tool_choice?: 'auto' | 'none' | 'required';
}
export interface GroqChatResponse {
    id: string;
    object: string;
    model: string;
    choices: {
        index: number;
        message: GroqMessage;
        finish_reason: string;
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export interface GroqStreamChunk {
    id: string;
    object: string;
    model: string;
    choices: {
        index: number;
        delta: {
            role?: string;
            content?: string;
            tool_calls?: GroqToolCall[];
        };
        finish_reason: string | null;
    }[];
}
export interface GroqApiKey {
    key: string;
    label: string;
    enabled: boolean;
}
export interface GroqProviderConfig {
    baseUrl: string;
    apiKeys: GroqApiKey[];
    defaultModel: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
}
export interface GroqFallbackResult {
    response: GroqChatResponse;
    usedKeyIndex: number;
    usedKeyLabel: string;
    model: string;
    isOnline: boolean;
}
export declare class GroqClient {
    private config;
    private lastUsedKeyIndex;
    private keyHealthMap;
    constructor(config: GroqProviderConfig);
    chatWithFallback(messages: GroqMessage[], model?: string, tools?: GroqTool[], options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
    }): Promise<GroqFallbackResult>;
    chat(messages: GroqMessage[], apiKey: string, model: string, tools?: GroqTool[], options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
    }): Promise<GroqChatResponse>;
    chatStream(messages: GroqMessage[], apiKey: string, model?: string, options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
    }): AsyncGenerator<GroqStreamChunk>;
    checkHealth(): Promise<{
        online: boolean;
        workingKeys: number;
        totalKeys: number;
    }>;
    isReachable(): Promise<boolean>;
    getKeyStatus(): {
        index: number;
        label: string;
        healthy: boolean;
        enabled: boolean;
    }[];
    getLastUsedKeyIndex(): number;
    getConfig(): GroqProviderConfig;
    updateConfig(config: GroqProviderConfig): void;
    addApiKey(key: string, label?: string): void;
    removeApiKey(index: number): void;
    private httpPost;
    private httpPostStream;
}
