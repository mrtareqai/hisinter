// ═══════════════════════════════════════════════════════════════
// Sinter AI — Groq / OpenAI-Compatible Client ⭐
// Multi-Key Fallback, Streaming, Health Check
// Works with: Groq, OpenAI, OpenRouter, Together AI, etc.
// ═══════════════════════════════════════════════════════════════

import * as https from 'https';
import * as http from 'http';

// ─── Types ──────────────────────────────────────────────────

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
        arguments: string; // JSON string
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
    label: string;   // e.g., "Key #1", "Backup Key"
    enabled: boolean;
}

export interface GroqProviderConfig {
    baseUrl: string;             // e.g., "https://api.groq.com/openai"
    apiKeys: GroqApiKey[];       // Multiple keys, tried in order
    defaultModel: string;        // e.g., "openai/gpt-oss-120b"
    temperature?: number;
    maxTokens?: number;
    topP?: number;
}

// ─── Fallback Result ────────────────────────────────────────

export interface GroqFallbackResult {
    response: GroqChatResponse;
    usedKeyIndex: number;        // Which key was used (0-based)
    usedKeyLabel: string;        // Label of the key used
    model: string;               // Model that responded
    isOnline: boolean;           // Was this an online response
}

// ─── Client ─────────────────────────────────────────────────

export class GroqClient {
    private config: GroqProviderConfig;
    private lastUsedKeyIndex: number = -1;
    private keyHealthMap: Map<number, boolean> = new Map(); // track which keys are working

    constructor(config: GroqProviderConfig) {
        this.config = config;
    }

    // ─── Chat with Multi-Key Fallback ───────────────────────
    async chatWithFallback(
        messages: GroqMessage[],
        model?: string,
        tools?: GroqTool[],
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<GroqFallbackResult> {
        const activeKeys = this.config.apiKeys.filter(k => k.enabled);

        if (activeKeys.length === 0) {
            throw new Error('NO_KEYS: لا يوجد مفاتيح API مفعّلة');
        }

        const errors: string[] = [];

        for (let i = 0; i < activeKeys.length; i++) {
            const apiKey = activeKeys[i];
            try {
                const response = await this.chat(
                    messages,
                    apiKey.key,
                    model || this.config.defaultModel,
                    tools,
                    options
                );

                this.lastUsedKeyIndex = i;
                this.keyHealthMap.set(i, true);

                return {
                    response,
                    usedKeyIndex: i + 1,  // 1-based for display
                    usedKeyLabel: apiKey.label || `Key #${i + 1}`,
                    model: model || this.config.defaultModel,
                    isOnline: true,
                };
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                errors.push(`${apiKey.label || `Key #${i + 1}`}: ${errMsg}`);
                this.keyHealthMap.set(i, false);
                console.warn(`⚠️ Groq Key #${i + 1} (${apiKey.label}) failed: ${errMsg}`);
                // Continue to next key
            }
        }

        // All keys failed
        throw new Error(`ALL_KEYS_FAILED: كل مفاتيح الـ API فشلت:\n${errors.join('\n')}`);
    }

    // ─── Single Chat Request ────────────────────────────────
    public async chat(
        messages: GroqMessage[],
        apiKey: string,
        model: string,
        tools?: GroqTool[],
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<GroqChatResponse> {
        const body: GroqChatRequest = {
            model,
            messages,
            temperature: options?.temperature ?? this.config.temperature ?? 1,
            max_completion_tokens: options?.maxTokens ?? this.config.maxTokens ?? 8192,
            top_p: options?.topP ?? this.config.topP ?? 1,
            stream: false,
            stop: null,
        };

        if (tools && tools.length > 0) {
            body.tools = tools;
            body.tool_choice = 'auto';
        }

        const data = await this.httpPost(
            `${this.config.baseUrl}/v1/chat/completions`,
            JSON.stringify(body),
            apiKey
        );

        const parsed = JSON.parse(data);

        if (parsed.error) {
            throw new Error(parsed.error.message || JSON.stringify(parsed.error));
        }

        return parsed as GroqChatResponse;
    }

    // ─── Streaming Chat ─────────────────────────────────────
    async *chatStream(
        messages: GroqMessage[],
        apiKey: string,
        model?: string,
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): AsyncGenerator<GroqStreamChunk> {
        const body: GroqChatRequest = {
            model: model || this.config.defaultModel,
            messages,
            temperature: options?.temperature ?? this.config.temperature ?? 1,
            max_completion_tokens: options?.maxTokens ?? this.config.maxTokens ?? 8192,
            top_p: options?.topP ?? this.config.topP ?? 1,
            stream: true,
            stop: null,
        };

        const stream = await this.httpPostStream(
            `${this.config.baseUrl}/v1/chat/completions`,
            JSON.stringify(body),
            apiKey
        );

        let buffer = '';
        for await (const chunk of stream) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.substring(6);
                    if (jsonStr === '[DONE]') { return; }
                    try {
                        yield JSON.parse(jsonStr);
                    } catch { /* skip malformed */ }
                }
            }
        }
    }

    // ─── Health Check ───────────────────────────────────────
    async checkHealth(): Promise<{ online: boolean; workingKeys: number; totalKeys: number }> {
        const activeKeys = this.config.apiKeys.filter(k => k.enabled);
        let workingKeys = 0;

        for (let i = 0; i < activeKeys.length; i++) {
            try {
                // Quick health check: send a minimal request
                await this.chat(
                    [{ role: 'user', content: 'hi' }],
                    activeKeys[i].key,
                    this.config.defaultModel,
                    undefined,
                    { maxTokens: 5 }
                );
                workingKeys++;
                this.keyHealthMap.set(i, true);
            } catch {
                this.keyHealthMap.set(i, false);
            }
        }

        return {
            online: workingKeys > 0,
            workingKeys,
            totalKeys: activeKeys.length,
        };
    }

    // ─── Quick Online Check (no API call) ───────────────────
    async isReachable(): Promise<boolean> {
        try {
            const urlObj = new URL(this.config.baseUrl);
            return new Promise((resolve) => {
                const lib = urlObj.protocol === 'https:' ? https : http;
                const req = lib.request({
                    hostname: urlObj.hostname,
                    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                    path: '/v1/models',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKeys[0]?.key || ''}`,
                    },
                    timeout: 5000,
                }, (res) => {
                    let data = '';
                    res.on('data', (c) => data += c);
                    res.on('end', () => resolve(res.statusCode === 200));
                });
                req.on('error', () => resolve(false));
                req.on('timeout', () => { req.destroy(); resolve(false); });
                req.end();
            });
        } catch {
            return false;
        }
    }

    // ─── Get Key Health Info ────────────────────────────────
    getKeyStatus(): { index: number; label: string; healthy: boolean; enabled: boolean }[] {
        return this.config.apiKeys.map((k, i) => ({
            index: i + 1,
            label: k.label || `Key #${i + 1}`,
            healthy: this.keyHealthMap.get(i) ?? true, // assume healthy until proven otherwise
            enabled: k.enabled,
        }));
    }

    getLastUsedKeyIndex(): number { return this.lastUsedKeyIndex; }

    getConfig(): GroqProviderConfig { return this.config; }

    updateConfig(config: GroqProviderConfig): void { this.config = config; }

    addApiKey(key: string, label?: string): void {
        const index = this.config.apiKeys.length + 1;
        this.config.apiKeys.push({
            key,
            label: label || `Key #${index}`,
            enabled: true,
        });
    }

    removeApiKey(index: number): void {
        if (index >= 0 && index < this.config.apiKeys.length) {
            this.config.apiKeys.splice(index, 1);
        }
    }

    // ─── HTTP Helpers ───────────────────────────────────────

    private httpPost(url: string, body: string, apiKey: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const lib = urlObj.protocol === 'https:' ? https : http;

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Length': Buffer.byteLength(body),
                },
                timeout: 30000,
            };

            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        try {
                            const errBody = JSON.parse(data);
                            reject(new Error(errBody.error?.message || `HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                        } catch {
                            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                        }
                    } else {
                        resolve(data);
                    }
                });
            });

            req.on('error', (e) => reject(new Error(`Connection failed: ${e.message}`)));
            req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout (30s)')); });
            req.write(body);
            req.end();
        });
    }

    private httpPostStream(url: string, body: string, apiKey: string): Promise<NodeJS.ReadableStream> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const lib = urlObj.protocol === 'https:' ? https : http;

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Length': Buffer.byteLength(body),
                },
                timeout: 60000,
            };

            const req = lib.request(options, (res) => {
                if (res.statusCode && res.statusCode >= 400) {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`)));
                } else {
                    resolve(res);
                }
            });

            req.on('error', (e) => reject(new Error(`Connection failed: ${e.message}`)));
            req.on('timeout', () => { req.destroy(); reject(new Error('Stream timeout')); });
            req.write(body);
            req.end();
        });
    }
}
