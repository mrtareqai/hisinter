export interface CodePattern {
    id: string;
    name: string;
    pattern: RegExp | string;
    type: 'positive' | 'anti-pattern';
    language: string;
    frequency: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggestion: string;
}
export interface PatternMatch {
    patternId: string;
    patternName: string;
    file: string;
    line: number;
    code: string;
    type: 'positive' | 'anti-pattern';
    severity: string;
    suggestion: string;
}
export declare class CodePatternAnalyzer {
    private patterns;
    private analysisHistory;
    constructor();
    private initializeDefaultPatterns;
    analyzeCode(code: string, file: string, language?: string): PatternMatch[];
    detectImprovements(matches: PatternMatch[]): {
        critical: PatternMatch[];
        improvements: string[];
        score: number;
    };
    getPatternFrequency(): Record<string, number>;
    getCommonIssues(limit?: number): PatternMatch[];
    suggestRefactoring(matches: PatternMatch[]): string[];
    addPattern(pattern: CodePattern): void;
    getPattern(id: string): CodePattern | undefined;
    getAllPatterns(): CodePattern[];
    getAnalysisHistory(limit?: number): typeof this.analysisHistory;
}
export default CodePatternAnalyzer;
