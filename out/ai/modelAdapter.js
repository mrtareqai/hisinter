"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Model Adapter Layer ⭐ (v5 — Multi-Provider Fallback Chain)
// Supports: Ollama (offline) + Groq (online) + OpenAI-compatible
// Multi-Key Fallback: tries each provider/key in priority order
// Shows which model/provider is responding
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelAdapter = void 0;
const groqClient_1 = require("./groqClient");
// ─── Known model capabilities ───────────────────────────────
const TOOL_CAPABLE_MODELS = [
    'qwen2.5', 'qwen2', 'qwen3', 'qwen',
    'llama3.1', 'llama3.2', 'llama3.3', 'llama4',
    'mistral', 'mixtral',
    'command-r', 'command-r-plus',
    'firefunction',
    'hermes', 'nous-hermes',
    'nexusraven',
    'gorilla',
    // NOTE: deepseek-coder:6.7b does NOT support native Ollama tools (400 error)
    // Only deepseek-v2/v3 support native tools
    'deepseek-v2', 'deepseek-v3',
    'gemma', 'gemma2', 'gemma3',
    // OpenAI-compatible models (via Groq/cloud)
    'gpt-4', 'gpt-3.5', 'gpt-4o', 'gpt-oss',
    'claude',
];
class ModelAdapter {
    client;
    groqClient = null;
    capabilitiesCache = new Map();
    providerChain = [];
    lastProviderUsed = '';
    lastModelUsed = '';
    isOnline = false;
    constructor(client) {
        this.client = client;
    }
    // ─── Provider Chain Setup ────────────────────────────────
    setProviderChain(chain) {
        this.providerChain = chain.sort((a, b) => a.priority - b.priority);
        // Initialize Groq client if there's a groq provider
        const groqProvider = chain.find(p => p.type === 'groq' && p.enabled && p.groqConfig);
        if (groqProvider && groqProvider.groqConfig) {
            this.groqClient = new groqClient_1.GroqClient(groqProvider.groqConfig);
        }
    }
    getProviderChain() { return this.providerChain; }
    getLastProviderUsed() { return this.lastProviderUsed; }
    getLastModelUsed() { return this.lastModelUsed; }
    getIsOnline() { return this.isOnline; }
    getGroqClient() { return this.groqClient; }
    // ─── Detect model capabilities ──────────────────────────
    getCapabilities(modelName) {
        if (this.capabilitiesCache.has(modelName)) {
            return this.capabilitiesCache.get(modelName);
        }
        const lower = modelName.toLowerCase();
        const family = this.extractFamily(lower);
        const caps = {
            supportsTools: TOOL_CAPABLE_MODELS.some(m => lower.includes(m)),
            supportsVision: lower.includes('llava') || lower.includes('bakllava') || lower.includes('moondream'),
            modelFamily: family,
            rawName: modelName,
        };
        this.capabilitiesCache.set(modelName, caps);
        return caps;
    }
    // ─── Chat with Fallback Chain ────────────────────────────
    // Tries each provider in priority order. On failure, moves to next.
    async chatWithFallback(model, messages, tools, options, onFallback) {
        const enabledProviders = this.providerChain.filter(p => p.enabled);
        if (enabledProviders.length === 0) {
            // No chain configured — use default Ollama
            return this.chat(model, messages, tools, options);
        }
        const errors = [];
        for (let i = 0; i < enabledProviders.length; i++) {
            const provider = enabledProviders[i];
            try {
                let response;
                if (provider.type === 'groq' && provider.groqConfig) {
                    response = await this.chatWithGroq(provider, messages, tools, options, onFallback);
                }
                else if (provider.type === 'ollama') {
                    const ollamaModel = provider.ollamaModel || model;
                    response = await this.chat(ollamaModel, messages, tools, options);
                    response.providerUsed = provider.name;
                    response.modelUsed = ollamaModel;
                    response.isOnline = false;
                }
                else {
                    continue; // skip unsupported types for now
                }
                this.lastProviderUsed = response.providerUsed || provider.name;
                this.lastModelUsed = response.modelUsed || model;
                this.isOnline = response.isOnline || false;
                return response;
            }
            catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                errors.push(`${provider.name}: ${errMsg}`);
                // Notify about fallback
                if (i < enabledProviders.length - 1) {
                    const nextProvider = enabledProviders[i + 1];
                    const fallbackMsg = `⚠️ ${provider.name} failed → trying ${nextProvider.name}...`;
                    onFallback?.(fallbackMsg);
                }
            }
        }
        // ── Last resort: try direct Ollama with the requested model ──
        // This catches cases where the chain's Ollama provider had a wrong model
        // name or config issue, but Ollama itself is running fine.
        try {
            onFallback?.('⚠️ All chain providers failed — trying direct Ollama connection...');
            const response = await this.chat(model, messages, tools, options);
            response.providerUsed = 'Ollama Direct (last resort)';
            response.modelUsed = model;
            response.isOnline = false;
            this.lastProviderUsed = 'Ollama Direct';
            this.lastModelUsed = model;
            this.isOnline = false;
            return response;
        }
        catch (lastError) {
            const lastMsg = lastError instanceof Error ? lastError.message : String(lastError);
            errors.push(`Direct Ollama: ${lastMsg}`);
        }
        // All providers AND direct fallback failed — show detailed errors
        const detail = errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n');
        throw new Error(`All providers failed:\n${detail}\n\nCheck: Is Ollama running? Is the model installed? Are API keys valid?`);
    }
    // ─── Chat with Groq (Multi-Key Fallback Logic in Adapter) ─
    async chatWithGroq(provider, messages, tools, options, onFallback) {
        if (!this.groqClient || !provider.groqConfig) {
            throw new Error('Groq client not configured');
        }
        const activeKeys = provider.groqConfig.apiKeys.filter(k => k.enabled);
        if (activeKeys.length === 0) {
            throw new Error('No enabled Groq API keys');
        }
        const groqMessages = messages.map(m => ({ role: m.role, content: m.content }));
        const groqTools = tools.map(t => ({
            type: 'function',
            function: { name: t.function.name, description: t.function.description, parameters: t.function.parameters }
        }));
        const errors = [];
        const model = provider.groqConfig.defaultModel;
        for (let i = 0; i < activeKeys.length; i++) {
            const apiKey = activeKeys[i];
            try {
                const response = await this.groqClient.chat(groqMessages, apiKey.key, model, groqTools.length > 0 ? groqTools : undefined, {
                    temperature: options?.temperature ?? 0.7,
                    maxTokens: options?.num_predict ?? 8192,
                    topP: options?.top_p ?? 1,
                });
                const choice = response.choices?.[0];
                if (!choice)
                    throw new Error('Empty response from Groq');
                const msg = choice.message;
                const toolCalls = [];
                if (msg.tool_calls) {
                    for (const tc of msg.tool_calls) {
                        try {
                            toolCalls.push({ name: tc.function.name, arguments: JSON.parse(tc.function.arguments || '{}') });
                        }
                        catch { }
                    }
                }
                if (toolCalls.length === 0 && msg.content) {
                    toolCalls.push(...this.parseToolCallsFromText(msg.content, tools));
                }
                return {
                    content: toolCalls.length > 0 ? this.removeToolJson(msg.content || '') : (msg.content || ''),
                    toolCalls,
                    isToolResponse: toolCalls.length > 0,
                    providerUsed: `${provider.name} ${apiKey.label || `Key #${i + 1}`}`,
                    modelUsed: model,
                    isOnline: true,
                };
            }
            catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                errors.push(`${apiKey.label || `Key #${i + 1}`}: ${errMsg}`);
                if (i < activeKeys.length - 1) {
                    onFallback?.(`⚠️ Groq Key #${i + 1} failed → trying Key #${i + 2}...`);
                }
            }
        }
        throw new Error(`All Groq API keys failed:\n${errors.join('\n')}`);
    }
    // ─── Single Chat Request (with Auto-Selection) ──────────
    async chat(model, messages, tools, options) {
        const caps = this.getCapabilities(model);
        const request = {
            model,
            messages: caps.supportsTools ? messages : this.injectToolPrompt(messages, this.buildToolPrompt(tools, caps.modelFamily)),
            tools: caps.supportsTools && tools.length > 0 ? tools : undefined,
            stream: false,
            options: options,
        };
        const response = await this.client.chat(request);
        const msg = response?.message;
        if (!msg) {
            return { content: '(no response from model)', toolCalls: [], isToolResponse: false };
        }
        const toolCalls = [];
        if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
            for (const tc of msg.tool_calls) {
                if (tc.function?.name) {
                    toolCalls.push({ name: tc.function.name, arguments: tc.function.arguments || {} });
                }
            }
        }
        if (toolCalls.length === 0 && msg.content) {
            toolCalls.push(...this.parseToolCallsFromText(msg.content, tools));
        }
        return {
            content: toolCalls.length > 0 ? this.removeToolJson(msg.content || '') : (msg.content || ''),
            toolCalls,
            isToolResponse: toolCalls.length > 0,
            providerUsed: 'Ollama Local',
            modelUsed: model,
            isOnline: false,
        };
    }
    // ─── Tool System Helpers ─────────────────────────────────
    buildToolPrompt(tools, family = 'unknown') {
        if (tools.length === 0)
            return '';
        const toolList = tools.map(t => `  - ${t.function.name}: ${t.function.description}`).join('\n');
        return `
=== TOOLS ===
You are an AUTONOMOUS AGENT. For ACTION requests, you MUST use tools.
For greetings (hi, hello), respond normally — no JSON, no tools.

IMPORTANT: To EDIT existing files, use file_replace or file_insert (NOT file_write).
WORKFLOW: file_read -> file_replace/file_insert/file_patch -> terminal_run validation
WHEN task is large: work in small scoped edits, then verify after each mutation.
NEVER regenerate full files unless creating a brand-new file.

RESPONSE FORMAT (JSON ONLY, no extra text):
\`\`\`json
{ "tool": "tool_name", "args": { "param1": "value1" } }
\`\`\`

AVAILABLE TOOLS:
${toolList}
=== END ===`;
    }
    injectToolPrompt(messages, prompt) {
        if (!prompt)
            return messages;
        const res = [...messages];
        const sys = res.find(m => m.role === 'system');
        if (sys)
            sys.content += '\n' + prompt;
        else
            res.unshift({ role: 'system', content: prompt });
        return res;
    }
    parseToolCallsFromText(text, tools) {
        const calls = [];
        const names = new Set(tools.map(t => t.function.name));
        // Use brace-balanced extraction to handle nested JSON objects
        const jsonBlocks = this.extractJsonBlocks(text);
        for (const str of jsonBlocks) {
            try {
                if (!str.includes('"tool"') && !str.includes('"function"') && !str.includes('"name"'))
                    continue;
                const p = JSON.parse(str);
                const toolName = p.tool || p.name || p.function;
                if (toolName && names.has(toolName)) {
                    calls.push({
                        name: toolName,
                        arguments: p.args || p.arguments || p.parameters || p.params || {}
                    });
                }
            }
            catch { }
        }
        return calls;
    }
    /**
     * Extract JSON blocks from text using brace-balancing.
     * Handles nested braces correctly, unlike the old regex approach.
     */
    extractJsonBlocks(text) {
        const blocks = [];
        let depth = 0;
        let start = -1;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '{') {
                if (depth === 0)
                    start = i;
                depth++;
            }
            else if (ch === '}') {
                depth--;
                if (depth === 0 && start >= 0) {
                    blocks.push(text.substring(start, i + 1));
                    start = -1;
                }
                if (depth < 0)
                    depth = 0;
            }
        }
        return blocks;
    }
    removeToolJson(text) {
        // Remove markdown fenced code blocks containing tool calls
        let clean = text.replace(/```(?:json)?\s*[\s\S]*?"tool"[\s\S]*?```/g, '');
        // Remove bare JSON tool call blocks (brace-balanced)
        const blocks = this.extractJsonBlocks(text);
        for (const block of blocks) {
            if (block.includes('"tool"') || block.includes('"function"')) {
                clean = clean.replace(block, '');
            }
        }
        // Remove array wrappers around tool calls like [ { ... }, { ... } ]
        clean = clean.replace(/\[\s*,?\s*\]/g, '');
        // Clean up leftover preamble that's just explaining the tool call
        // If the remaining text is very short or just explaining what was done, return empty
        const trimmed = clean.replace(/\s+/g, ' ').trim();
        if (trimmed.length < 10)
            return '';
        return trimmed;
    }
    extractFamily(name) {
        const f = ['phi3', 'qwen', 'llama', 'mistral', 'gemma', 'deepseek', 'gpt'];
        for (const x of f)
            if (name.includes(x))
                return x;
        return 'unknown';
    }
    clearCache() { this.capabilitiesCache.clear(); }
}
exports.ModelAdapter = ModelAdapter;
//# sourceMappingURL=modelAdapter.js.map