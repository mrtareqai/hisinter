// ═══════════════════════════════════════════════════════════════
// Sinter AI — Tool Registry & Executor
// Central registry for all tools available to the Agent
// ═══════════════════════════════════════════════════════════════

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
    images?: string[]; // base64 images for vision feedback
}

export class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();

    register(tool: ToolDefinition): void {
        this.tools.set(tool.name, tool);
    }

    unregister(name: string): void {
        this.tools.delete(name);
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    getAll(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    // Convert to Ollama tool format
    toOllamaTools(): OllamaTool[] {
        return this.getAll().map(tool => {
            const properties: Record<string, { type: string; description: string; enum?: string[] }> = {};
            const required: string[] = [];

            for (const [key, param] of Object.entries(tool.parameters)) {
                properties[key] = {
                    type: param.type,
                    description: param.description,
                };
                if (param.enum) {
                    properties[key].enum = param.enum;
                }
                if (param.required !== false) {
                    required.push(key);
                }
            }

            return {
                type: 'function' as const,
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: {
                        type: 'object' as const,
                        properties,
                        required,
                    },
                },
            };
        });
    }

    // Execute a tool by name
    async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
        const tool = this.tools.get(name);
        if (!tool) {
            return {
                success: false,
                output: `Tool '${name}' not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
            };
        }

        try {
            return await tool.execute(args);
        } catch (error) {
            return {
                success: false,
                output: `Tool '${name}' failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
}
