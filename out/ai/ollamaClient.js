"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Ollama Client
// Handles all communication with local Ollama API
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
exports.OllamaClient = void 0;
const http = __importStar(require("http"));
class OllamaClient {
    baseUrl;
    constructor(baseUrl = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
    }
    // ─── Chat (non-streaming) ───────────────────────────────
    async chat(request) {
        const body = JSON.stringify({ ...request, stream: false });
        return this.post('/api/chat', body);
    }
    // ─── Chat (streaming) ───────────────────────────────────
    async *chatStream(request) {
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
                    }
                    catch {
                        // skip malformed JSON
                    }
                }
            }
        }
    }
    // ─── List Models ────────────────────────────────────────
    async listModels() {
        const result = await this.get('/api/tags');
        return result.models || [];
    }
    // ─── Pull Model (streaming progress) ────────────────────
    async *pullModel(name) {
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
                    }
                    catch {
                        // skip
                    }
                }
            }
        }
    }
    // ─── Delete Model ───────────────────────────────────────
    async deleteModel(name) {
        const url = new URL('/api/delete', this.baseUrl);
        const body = JSON.stringify({ name });
        return new Promise((resolve, reject) => {
            const req = http.request(url, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                }
                else {
                    reject(new Error(`Delete failed: ${res.statusCode}`));
                }
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
    // ─── Health Check ───────────────────────────────────────
    async isRunning() {
        try {
            // Ollama's root returns text "Ollama is running", not JSON.
            const url = new URL('/', this.baseUrl);
            return new Promise((resolve) => {
                http.get(url, (res) => {
                    resolve(res.statusCode === 200);
                }).on('error', () => resolve(false));
            });
        }
        catch {
            return false;
        }
    }
    // ─── HTTP Helpers ───────────────────────────────────────
    get(path) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            http.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch {
                        reject(new Error('Invalid JSON'));
                    }
                });
            }).on('error', reject);
        });
    }
    post(path, body) {
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
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch {
                        reject(new Error(`Invalid JSON response from Ollama: ${data.substring(0, 100)}`));
                    }
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
    rawPost(url, body) {
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
exports.OllamaClient = OllamaClient;
//# sourceMappingURL=ollamaClient.js.map