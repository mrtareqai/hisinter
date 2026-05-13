// ═══════════════════════════════════════════════════════════════
// Sinter AI — Ollama Client
// Handles all communication with local Ollama API
// ═══════════════════════════════════════════════════════════════

import * as http from 'http';

export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    images?: string[]; // base64 encoded images for vision models
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
            properties: Record<string, { type: string; description: string; enum?: string[] }>;
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

export class OllamaClient {
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
    }

    // ─── Chat (non-streaming) ───────────────────────────────
    async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
        const body = JSON.stringify({ ...request, stream: false });
        return this.post<OllamaChatResponse>('/api/chat', body);
    }

    // ─── Chat (streaming) ───────────────────────────────────
    async *chatStream(request: OllamaChatRequest): AsyncGenerator<OllamaChatResponse> {
        const body = JSON.stringify({ ...request, stream: true });
        const url = new URL('/api/chat', this.baseUrl);

        const response = await this.rawPost(url, body);
        let buffer = '';

        for await (const chunk of response) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        yield JSON.parse(line);
                    } catch {
                        // skip malformed JSON
                    }
                }
            }
        }
    }

    // ─── List Models ────────────────────────────────────────
    async listModels(): Promise<OllamaModel[]> {
        const result = await this.get<{ models: OllamaModel[] }>('/api/tags');
        return result.models || [];
    }

    // ─── Pull Model (streaming progress) ────────────────────
    async *pullModel(name: string): AsyncGenerator<{ status: string; completed?: number; total?: number }> {
        const body = JSON.stringify({ name, stream: true });
        const url = new URL('/api/pull', this.baseUrl);
        const response = await this.rawPost(url, body);
        let buffer = '';

        for await (const chunk of response) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        yield JSON.parse(line);
                    } catch {
                        // skip
                    }
                }
            }
        }
    }

    // ─── Delete Model ───────────────────────────────────────
    async deleteModel(name: string): Promise<void> {
        const url = new URL('/api/delete', this.baseUrl);
        const body = JSON.stringify({ name });

        return new Promise((resolve, reject) => {
            const req = http.request(url, { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }, (res) => {
                if (res.statusCode === 200) { resolve(); }
                else { reject(new Error(`Delete failed: ${res.statusCode}`)); }
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    // ─── Health Check ───────────────────────────────────────
    async isRunning(): Promise<boolean> {
        try {
            // Ollama's root returns text "Ollama is running", not JSON.
            const url = new URL('/', this.baseUrl);
            return new Promise((resolve) => {
                http.get(url, (res) => {
                    resolve(res.statusCode === 200);
                }).on('error', () => resolve(false));
            });
        } catch {
            return false;
        }
    }

    // ─── HTTP Helpers ───────────────────────────────────────
    private get<T>(path: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            http.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch { reject(new Error('Invalid JSON')); }
                });
            }).on('error', reject);
        });
    }

    private post<T>(path: string, body: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const req = http.request(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeout: 600000 // 10 minutes for full chat response (slow models/hardware)
            }, (res) => {
                if (res.statusCode !== 200) {
                    let errData = '';
                    res.on('data', (c) => errData += c);
                    res.on('end', () => reject(new Error(`Ollama error (${res.statusCode}): ${errData || 'Unknown error'}`)));
                    return;
                }
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch { reject(new Error(`Invalid JSON response from Ollama: ${data.substring(0, 100)}`)); }
                });
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Ollama request timed out (model might be too large or loading slowly)'));
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    private rawPost(url: URL, body: string): Promise<NodeJS.ReadableStream> {
        return new Promise((resolve, reject) => {
            const req = http.request(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeout: 900000 // 15 minutes for streaming/pulling
            }, (res) => {
                resolve(res);
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}
