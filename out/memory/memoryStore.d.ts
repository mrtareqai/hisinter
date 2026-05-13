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
export declare class MemoryStore {
    private storageDir;
    private conversationsDir;
    private contextFile;
    private userContext;
    private currentConversation;
    constructor(storageDir: string);
    /** Create a new conversation */
    createConversation(mode: string, model: string): Conversation;
    /** Get current conversation or create one */
    getCurrentConversation(mode: string, model: string): Conversation;
    /** Add message to current conversation */
    addMessage(role: ConversationMessage['role'], content: string): void;
    /** Generate a short title from user message */
    private generateTitle;
    /** Save conversation to disk */
    saveConversation(conv: Conversation): void;
    /** Load a specific conversation */
    loadConversation(id: string): Conversation | null;
    /** List all conversations (sorted by most recent) */
    listConversations(): Conversation[];
    /** Delete a conversation */
    deleteConversation(id: string): boolean;
    /** Switch to a different conversation */
    switchConversation(id: string): Conversation | null;
    /** Start a new conversation (keeps old one saved) */
    newConversation(mode: string, model: string): Conversation;
    /** Get messages for agent history */
    getCurrentMessages(): {
        role: string;
        content: string;
    }[];
    /** Get user context */
    getUserContext(): UserContext;
    /** Update user context */
    updateUserContext(updates: Partial<UserContext>): void;
    /** Add a note about the user */
    addUserNote(note: string): void;
    /** Get context string for injection into prompts */
    getContextPrompt(): string;
    private loadUserContext;
    private saveUserContext;
    private generateId;
}
