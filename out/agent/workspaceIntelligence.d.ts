/**
 * Workspace Intelligence System
 * Analyzes project structure, dependencies, and patterns for intelligent assistance
 */
export interface ProjectMetadata {
    name: string;
    type: 'nodejs' | 'python' | 'rust' | 'java' | 'go' | 'unknown';
    frameworks: string[];
    dependencies: Map<string, string>;
    devDependencies: Map<string, string>;
    files: Map<string, FileMetadata>;
    entryPoints: string[];
    structure: DirectoryStructure;
}
export interface FileMetadata {
    path: string;
    size: number;
    language: string;
    imports: string[];
    exports: string[];
    lastModified: number;
}
export interface DirectoryStructure {
    name: string;
    type: 'file' | 'directory';
    children?: DirectoryStructure[];
    fileCount?: number;
}
export declare class WorkspaceIntelligence {
    private metadata;
    private codePatterns;
    private fileCache;
    analyzeWorkspace(workspaceRoot: string): Promise<ProjectMetadata>;
    private detectProjectType;
    private scanFiles;
    private detectEntryPoints;
    private analyzePatterns;
    private buildStructure;
    private getLanguage;
    getMetadata(): ProjectMetadata | null;
    getFilesByLanguage(language: string): FileMetadata[];
    getCommonPatterns(): string[];
    getFilesSummary(): {
        total: number;
        byLanguage: Record<string, number>;
    };
}
export declare const globalWorkspaceIntelligence: WorkspaceIntelligence;
