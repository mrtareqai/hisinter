// ═══════════════════════════════════════════════════════════════
// Sinter AI — Memory Store ⭐
// Persistent conversation storage + context memory
// Saves conversations to JSON files locally
// ═══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';

// ─── Types ──────────────────────────────────────────────────
export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: number;
}

export interface Conversation {
    id: string;
    title: string;
    messages: ConversationMessage[];
    createdAt: number;
    updatedAt: number;
    mode: string;
    model: string;
    summary?: string;
}

export interface UserContext {
    name?: string;
    preferences: Record<string, string>;
    recentProjects: string[];
    notes: string[];
    lastSeen: number;
}

// ─── Memory Store ───────────────────────────────────────────
export class MemoryStore {
    private storageDir: string;
    private conversationsDir: string;
    private contextFile: string;
    private userContext: UserContext;
    private currentConversation: Conversation | null = null;

    constructor(storageDir: string) {
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
    createConversation(mode: string, model: string): Conversation {
        const conv: Conversation = {
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
    getCurrentConversation(mode: string, model: string): Conversation {
        if (!this.currentConversation) {
            this.currentConversation = this.createConversation(mode, model);
        }
        return this.currentConversation;
    }

    /** Add message to current conversation */
    addMessage(role: ConversationMessage['role'], content: string): void {
        if (!this.currentConversation) { return; }

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
    private generateTitle(text: string): string {
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
    saveConversation(conv: Conversation): void {
        try {
            const filePath = path.join(this.conversationsDir, `${conv.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(conv, null, 2), 'utf-8');
        } catch (e) {
            console.error('Failed to save conversation:', e);
        }
    }

    /** Load a specific conversation */
    loadConversation(id: string): Conversation | null {
        try {
            const filePath = path.join(this.conversationsDir, `${id}.json`);
            if (!fs.existsSync(filePath)) { return null; }
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data) as Conversation;
        } catch {
            return null;
        }
    }

    /** List all conversations (sorted by most recent) */
    listConversations(): Conversation[] {
        try {
            const files = fs.readdirSync(this.conversationsDir)
                .filter(f => f.endsWith('.json'));

            const conversations: Conversation[] = [];
            for (const file of files) {
                try {
                    const data = fs.readFileSync(
                        path.join(this.conversationsDir, file), 'utf-8'
                    );
                    const conv = JSON.parse(data) as Conversation;
                    // Don't load full messages for listing — just metadata
                    conversations.push({
                        ...conv,
                        messages: [], // Empty for performance
                        summary: conv.messages.length > 0
                            ? `${conv.messages.length} messages`
                            : 'Empty',
                    });
                } catch { /* skip corrupt files */ }
            }

            // Sort by most recent
            conversations.sort((a, b) => b.updatedAt - a.updatedAt);
            return conversations;
        } catch {
            return [];
        }
    }

    /** Delete a conversation */
    deleteConversation(id: string): boolean {
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
        } catch {
            return false;
        }
    }

    /** Switch to a different conversation */
    switchConversation(id: string): Conversation | null {
        const conv = this.loadConversation(id);
        if (conv) {
            this.currentConversation = conv;
        }
        return conv;
    }

    /** Start a new conversation (keeps old one saved) */
    newConversation(mode: string, model: string): Conversation {
        this.currentConversation = this.createConversation(mode, model);
        return this.currentConversation;
    }

    /** Get messages for agent history */
    getCurrentMessages(): { role: string; content: string }[] {
        if (!this.currentConversation) { return []; }
        return this.currentConversation.messages.map(m => ({
            role: m.role,
            content: m.content,
        }));
    }

    // ─── User Context ───────────────────────────────────────

    /** Get user context */
    getUserContext(): UserContext {
        return this.userContext;
    }

    /** Update user context */
    updateUserContext(updates: Partial<UserContext>): void {
        this.userContext = { ...this.userContext, ...updates, lastSeen: Date.now() };
        this.saveUserContext();
    }

    /** Add a note about the user */
    addUserNote(note: string): void {
        if (!this.userContext.notes.includes(note)) {
            this.userContext.notes.push(note);
            if (this.userContext.notes.length > 20) {
                this.userContext.notes = this.userContext.notes.slice(-20);
            }
            this.saveUserContext();
        }
    }

    /** Get context string for injection into prompts */
    getContextPrompt(): string {
        const parts: string[] = [];
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

    private loadUserContext(): UserContext {
        try {
            if (fs.existsSync(this.contextFile)) {
                const data = fs.readFileSync(this.contextFile, 'utf-8');
                return JSON.parse(data) as UserContext;
            }
        } catch { /* use defaults */ }

        return {
            preferences: {},
            recentProjects: [],
            notes: [],
            lastSeen: Date.now(),
        };
    }

    private saveUserContext(): void {
        try {
            fs.writeFileSync(this.contextFile, JSON.stringify(this.userContext, null, 2), 'utf-8');
        } catch (e) {
            console.error('Failed to save user context:', e);
        }
    }

    private generateId(): string {
        const now = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        return `${now}-${rand}`;
    }
}
