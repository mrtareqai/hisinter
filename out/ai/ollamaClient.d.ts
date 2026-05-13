export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    images?: string[];
    tool_calls?: OllamaToolCall[];
}
export interface OllamaToolCall {
    function: {
        name: string;
        arguments: Record<string, unknown>;
    };
}
export interface OllamaTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, {
                type: string;
                description: string;
                enum?: string[];
            }>;
            required?: string[];
        };
    };
}
export interface OllamaChatRequest {
    model: string;
    messages: OllamaMessage[];
    stream?: boolean;
    tools?: OllamaTool[];
    options?: {
        temperature?: number;
        num_predict?: number;
        top_p?: number;
        top_k?: number;
    };
}
export interface OllamaChatResponse {
    model: string;
    message: OllamaMessage;
    done: boolean;
    total_duration?: number;
    eval_count?: number;
}
export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
    details?: {
        parameter_size: string;
        quantization_level: string;
        family: string;
    };
}
export declare class OllamaClient {
    private baseUrl;
    constructor(baseUrl?: string);
    chat(request: OllamaChatRequest): Promise<OllamaChatResponse>;
    chatStream(request: OllamaChatRequest): AsyncGenerator<OllamaChatResponse>;
    listModels(): Promise<OllamaModel[]>;
    pullModel(name: string): AsyncGenerator<{
        status: string;
        completed?: number;
        total?: number;
    }>;
    deleteModel(name: string): Promise<void>;
    isRunning(): Promise<boolean>;
    private get;
    private post;
    private rawPost;
}
