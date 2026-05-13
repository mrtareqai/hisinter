"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Memory Store ⭐
// Persistent conversation storage + context memory
// Saves conversations to JSON files locally
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
exports.MemoryStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─── Memory Store ───────────────────────────────────────────
class MemoryStore {
    storageDir;
    conversationsDir;
    contextFile;
    userContext;
    currentConversation = null;
    constructor(storageDir) {
        this.storageDir = storageDir;
        this.conversationsDir = path.join(storageDir, 'conversations');
        this.contextFile = path.join(storageDir, 'user_context.json');
        // Create directories
        fs.mkdirSync(this.conversationsDir, { recursive: true });
        // Load user context
        this.userContext = this.loadUserContext();
    }
    // ─── Conversation Management ────────────────────────────
    /** Create a new conversation */
    createConversation(mode, model) {
        const conv = {
            id: this.generateId(),
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            mode,
            model,
        };
        this.currentConversation = conv;
        return conv;
    }
    /** Get current conversation or create one */
    getCurrentConversation(mode, model) {
        if (!this.currentConversation) {
            this.currentConversation = this.createConversation(mode, model);
        }
        return this.currentConversation;
    }
    /** Add message to current conversation */
    addMessage(role, content) {
        if (!this.currentConversation) {
            return;
        }
        this.currentConversation.messages.push({
            role,
            content,
            timestamp: Date.now(),
        });
        this.currentConversation.updatedAt = Date.now();
        // Auto-title from first user message
        if (role === 'user' && this.currentConversation.title === 'New Chat') {
            this.currentConversation.title = this.generateTitle(content);
        }
        // Auto-save
        this.saveConversation(this.currentConversation);
    }
    /** Generate a short title from user message */
    generateTitle(text) {
        // Take first 40 chars, clean up
        let title = text.substring(0, 50).trim();
        // Remove newlines
        title = title.replace(/[\n\r]/g, ' ');
        // Truncate at word boundary
        if (title.length > 40) {
            const lastSpace = title.lastIndexOf(' ', 40);
            title = title.substring(0, lastSpace > 10 ? lastSpace : 40) + '...';
        }
        return title;
    }
    /** Save conversation to disk */
    saveConversation(conv) {
        try {
            const filePath = path.join(this.conversationsDir, `${conv.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(conv, null, 2), 'utf-8');
        }
        catch (e) {
            console.error('Failed to save conversation:', e);
        }
    }
    /** Load a specific conversation */
    loadConversation(id) {
        try {
            const filePath = path.join(this.conversationsDir, `${id}.json`);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return null;
        }
    }
    /** List all conversations (sorted by most recent) */
    listConversations() {
        try {
            const files = fs.readdirSync(this.conversationsDir)
                .filter(f => f.endsWith('.json'));
            const conversations = [];
            for (const file of files) {
                try {
                    const data = fs.readFileSync(path.join(this.conversationsDir, file), 'utf-8');
                    const conv = JSON.parse(data);
                    // Don't load full messages for listing — just metadata
                    conversations.push({
                        ...conv,
                        messages: [], // Empty for performance
                        summary: conv.messages.length > 0
                            ? `${conv.messages.length} messages`
                            : 'Empty',
                    });
                }
                catch { /* skip corrupt files */ }
            }
            // Sort by most recent
            conversations.sort((a, b) => b.updatedAt - a.updatedAt);
            return conversations;
        }
        catch {
            return [];
        }
    }
    /** Delete a conversation */
    deleteConversation(id) {
        try {
            const filePath = path.join(this.conversationsDir, `${id}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                // If deleting current conversation, clear it
                if (this.currentConversation?.id === id) {
                    this.currentConversation = null;
                }
                return true;
            }
            return false;
        }
        catch {
            return false;
        }
    }
    /** Switch to a different conversation */
    switchConversation(id) {
        const conv = this.loadConversation(id);
        if (conv) {
            this.currentConversation = conv;
        }
        return conv;
    }
    /** Start a new conversation (keeps old one saved) */
    newConversation(mode, model) {
        this.currentConversation = this.createConversation(mode, model);
        return this.currentConversation;
    }
    /** Get messages for agent history */
    getCurrentMessages() {
        if (!this.currentConversation) {
            return [];
        }
        return this.currentConversation.messages.map(m => ({
            role: m.role,
            content: m.content,
        }));
    }
    // ─── User Context ───────────────────────────────────────
    /** Get user context */
    getUserContext() {
        return this.userContext;
    }
    /** Update user context */
    updateUserContext(updates) {
        this.userContext = { ...this.userContext, ...updates, lastSeen: Date.now() };
        this.saveUserContext();
    }
    /** Add a note about the user */
    addUserNote(note) {
        if (!this.userContext.notes.includes(note)) {
            this.userContext.notes.push(note);
            if (this.userContext.notes.length > 20) {
                this.userContext.notes = this.userContext.notes.slice(-20);
            }
            this.saveUserContext();
        }
    }
    /** Get context string for injection into prompts */
    getContextPrompt() {
        const parts = [];
        if (this.userContext.name) {
            parts.push(`User's name: ${this.userContext.name}`);
        }
        if (this.userContext.notes.length > 0) {
            parts.push(`Notes about user: ${this.userContext.notes.slice(-5).join('; ')}`);
        }
        if (this.userContext.recentProjects.length > 0) {
            parts.push(`Recent projects: ${this.userContext.recentProjects.slice(-3).join(', ')}`);
        }
        return parts.length > 0 ? '\n[User Context: ' + parts.join(' | ') + ']' : '';
    }
    // ─── Private Helpers ────────────────────────────────────
    loadUserContext() {
        try {
            if (fs.existsSync(this.contextFile)) {
                const data = fs.readFileSync(this.contextFile, 'utf-8');
                return JSON.parse(data);
            }
        }
        catch { /* use defaults */ }
        return {
            preferences: {},
            recentProjects: [],
            notes: [],
            lastSeen: Date.now(),
        };
    }
    saveUserContext() {
        try {
            fs.writeFileSync(this.contextFile, JSON.stringify(this.userContext, null, 2), 'utf-8');
        }
        catch (e) {
            console.error('Failed to save user context:', e);
        }
    }
    generateId() {
        const now = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        return `${now}-${rand}`;
    }
}
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=memoryStore.js.map