import { OllamaTool } from '../ai/ollamaClient';
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        required?: boolean;
    }>;
    execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}
export interface ToolResult {
    success: boolean;
    output: string;
    data?: unknown;
    images?: string[];
}
export declare class ToolRegistry {
    private tools;
    register(tool: ToolDefinition): void;
    unregister(name: string): void;
    get(name: string): ToolDefinition | undefined;
    getAll(): ToolDefinition[];
    toOllamaTools(): OllamaTool[];
    execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;
}
