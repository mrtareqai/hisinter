export interface ContextItem {
    type: 'file' | 'folder' | 'symbol' | 'problems' | 'terminal';
    label: string;
    description: string;
    detail?: string;
    filePath?: string;
    icon: string;
}
export interface ResolvedContext {
    tag: string;
    type: string;
    content: string;
    filePath?: string;
    lines?: number;
}
export declare class ContextProvider {
    private workspaceRoot;
    private lastTerminalOutput;
    constructor(workspaceRoot: string);
    setLastTerminalOutput(output: string): void;
    /** Search workspace for files/symbols matching query */
    search(query: string): Promise<ContextItem[]>;
    /** Resolve a context reference to actual content */
    resolve(item: ContextItem): Promise<ResolvedContext>;
    /** Build context string from multiple resolved references */
    buildContextString(contexts: ResolvedContext[]): string;
}
