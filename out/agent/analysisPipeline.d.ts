import { ProjectMap } from './codebaseExplorer';
export interface Suggestion {
    priority: 'critical' | 'high' | 'medium' | 'low';
    area: string;
    title: string;
    description: string;
    file: string;
    estimatedEffort: string;
}
export interface AnalysisResult {
    projectName: string;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: Suggestion[];
    architecture: string;
    riskAreas: string[];
    fileTable: {
        file: string;
        lines: number;
        language: string;
        complexity: string;
    }[];
}
export declare class AnalysisPipeline {
    /** Run full analysis on a project */
    analyze(projectMap: ProjectMap): AnalysisResult;
    /** Format analysis as a readable Markdown report */
    formatAsMarkdown(result: AnalysisResult): string;
    private findStrengths;
    private findWeaknesses;
    private describeArchitecture;
    private buildSummary;
}
