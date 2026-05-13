import { ProgressReporter } from './progressReporter';
export interface FileNode {
    name: string;
    path: string;
    isDir: boolean;
    size?: number;
    children?: FileNode[];
}
export interface FileAnalysis {
    path: string;
    relativePath: string;
    language: string;
    lines: number;
    size: number;
    content: string;
    exports: string[];
    imports: string[];
    classes: string[];
    functions: string[];
    complexity: 'low' | 'medium' | 'high';
}
export interface DependencyEdge {
    from: string;
    to: string;
}
export interface ProjectStats {
    totalFiles: number;
    totalSourceFiles: number;
    totalLines: number;
    totalSize: number;
    languages: Record<string, number>;
    largestFiles: {
        path: string;
        lines: number;
    }[];
}
export interface ProjectMap {
    root: string;
    structure: FileNode[];
    configFiles: string[];
    sourceFiles: FileAnalysis[];
    dependencies: DependencyEdge[];
    stats: ProjectStats;
}
export declare class CodebaseExplorer {
    /** Full project scan — reads every source file */
    fullScan(workspaceRoot: string, reporter?: ProgressReporter): Promise<ProjectMap>;
    /** Quick scan — only reads specified files */
    quickScan(workspaceRoot: string, targetFiles: string[], reporter?: ProgressReporter): Promise<ProjectMap>;
    /** Find files relevant to a specific task description */
    findRelevantFiles(projectMap: ProjectMap, taskDescription: string): string[];
    private buildTree;
    private flattenTree;
    private analyzeFile;
    private buildDependencies;
    private computeStats;
}
