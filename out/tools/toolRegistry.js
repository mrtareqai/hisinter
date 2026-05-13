"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Tool Registry & Executor
// Central registry for all tools available to the Agent
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
class ToolRegistry {
    tools = new Map();
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    unregister(name) {
        this.tools.delete(name);
    }
    get(name) {
        return this.tools.get(name);
    }
    getAll() {
        return Array.from(this.tools.values());
    }
    // Convert to Ollama tool format
    toOllamaTools() {
        return this.getAll().map(tool => {
            const properties = {};
            const required = [];
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
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: {
                        type: 'object',
                        properties,
                        required,
                    },
                },
            };
        });
    }
    // Execute a tool by name
    async execute(name, args) {
        const tool = this.tools.get(name);
        if (!tool) {
            return {
                success: false,
                output: `Tool '${name}' not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
            };
        }
        try {
            return await tool.execute(args);
        }
        catch (error) {
            return {
                success: false,
                output: `Tool '${name}' failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
}
exports.ToolRegistry = ToolRegistry;
//# sourceMappingURL=toolRegistry.js.map