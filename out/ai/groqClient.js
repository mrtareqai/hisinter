"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Groq / OpenAI-Compatible Client ⭐
// Multi-Key Fallback, Streaming, Health Check
// Works with: Groq, OpenAI, OpenRouter, Together AI, etc.
// ═══════════════════════════════════════════════════════════════
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqClient = void 0;
const https = __importStar(require("https"));
const http = __importStar(require("http"));
// ─── Client ─────────────────────────────────────────────────
class GroqClient {
    config;
    lastUsedKeyIndex = -1;
    keyHealthMap = new Map(); // track which keys are working
    constructor(config) {
        this.config = config;
    }
    // ─── Chat with Multi-Key Fallback ───────────────────────
    async chatWithFallback(messages, model, tools, options) {
        const activeKeys = this.config.apiKeys.filter(k => k.enabled);
        if (activeKeys.length === 0) {
            throw new Error('NO_KEYS: لا يوجد مفاتيح API مفعّلة');
        }
        const errors = [];
        for (let i = 0; i < activeKeys.length; i++) {
            const apiKey = activeKeys[i];
            try {
                const response = await this.chat(messages, apiKey.key, model || this.config.defaultModel, tools, options);
                this.lastUsedKeyIndex = i;
                this.keyHealthMap.set(i, true);
                return {
                    response,
                    usedKeyIndex: i + 1, // 1-based for display
                    usedKeyLabel: apiKey.label || `Key #${i + 1}`,
                    model: model || this.config.defaultModel,
                    isOnline: true,
                };
            }
            catch (error) {
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
    async chat(messages, apiKey, model, tools, options) {
        const body = {
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
        const data = await this.httpPost(`${this.config.baseUrl}/v1/chat/completions`, JSON.stringify(body), apiKey);
        const parsed = JSON.parse(data);
        if (parsed.error) {
            throw new Error(parsed.error.message || JSON.stringify(parsed.error));
        }
        return parsed;
    }
    // ─── Streaming Chat ─────────────────────────────────────
    async *chatStream(messages, apiKey, model, options) {
        const body = {
            model: model || this.config.defaultModel,
            messages,
            temperature: options?.temperature ?? this.config.temperature ?? 1,
            max_completion_tokens: options?.maxTokens ?? this.config.maxTokens ?? 8192,
            top_p: options?.topP ?? this.config.topP ?? 1,
            stream: true,
            stop: null,
        };
        const stream = await this.httpPostStream(`${this.config.baseUrl}/v1/chat/completions`, JSON.stringify(body), apiKey);
        let buffer = '';
        for await (const chunk of stream) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.substring(6);
                    if (jsonStr === '[DONE]') {
                        return;
                    }
                    try {
                        yield JSON.parse(jsonStr);
                    }
                    catch { /* skip malformed */ }
                }
            }
        }
    }
    // ─── Health Check ───────────────────────────────────────
    async checkHealth() {
        const activeKeys = this.config.apiKeys.filter(k => k.enabled);
        let workingKeys = 0;
        for (let i = 0; i < activeKeys.length; i++) {
            try {
                // Quick health check: send a minimal request
                await this.chat([{ role: 'user', content: 'hi' }], activeKeys[i].key, this.config.defaultModel, undefined, { maxTokens: 5 });
                workingKeys++;
                this.keyHealthMap.set(i, true);
            }
            catch {
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
    async isReachable() {
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
        }
        catch {
            return false;
        }
    }
    // ─── Get Key Health Info ────────────────────────────────
    getKeyStatus() {
        return this.config.apiKeys.map((k, i) => ({
            index: i + 1,
            label: k.label || `Key #${i + 1}`,
            healthy: this.keyHealthMap.get(i) ?? true, // assume healthy until proven otherwise
            enabled: k.enabled,
        }));
    }
    getLastUsedKeyIndex() { return this.lastUsedKeyIndex; }
    getConfig() { return this.config; }
    updateConfig(config) { this.config = config; }
    addApiKey(key, label) {
        const index = this.config.apiKeys.length + 1;
        this.config.apiKeys.push({
            key,
            label: label || `Key #${index}`,
            enabled: true,
        });
    }
    removeApiKey(index) {
        if (index >= 0 && index < this.config.apiKeys.length) {
            this.config.apiKeys.splice(index, 1);
        }
    }
    // ─── HTTP Helpers ───────────────────────────────────────
    httpPost(url, body, apiKey) {
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
                        }
                        catch {
                            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                        }
                    }
                    else {
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
    httpPostStream(url, body, apiKey) {
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
                }
                else {
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
exports.GroqClient = GroqClient;
//# sourceMappingURL=groqClient.js.map