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

export class CodePatternAnalyzer {
  private patterns: Map<string, CodePattern> = new Map();
  private analysisHistory: Array<{
    file: string;
    timestamp: number;
    matches: PatternMatch[];
  }> = [];

  constructor() {
    this.initializeDefaultPatterns();
  }

  private initializeDefaultPatterns(): void {
    const patterns: CodePattern[] = [
      {
        id: 'async-await',
        name: 'Async/Await Pattern',
        pattern: /async\s+\w+\s*\([^)]*\)\s*{/,
        type: 'positive',
        language: 'typescript',
        frequency: 0,
        severity: 'low',
        suggestion: 'Good use of async/await for async operations',
      },
      {
        id: 'error-handling',
        name: 'Try-Catch Error Handling',
        pattern: /try\s*{[\s\S]*?}\s*catch/,
        type: 'positive',
        language: 'typescript',
        frequency: 0,
        severity: 'low',
        suggestion: 'Good error handling practice',
      },
      {
        id: 'callback-hell',
        name: 'Callback Hell Anti-Pattern',
        pattern: /\.\s*then\s*\([^)]*\s*\.\s*then\s*\([^)]*\s*\.\s*then/,
        type: 'anti-pattern',
        language: 'typescript',
        frequency: 0,
        severity: 'high',
        suggestion: 'Refactor to use async/await instead of promise chains',
      },
      {
        id: 'unused-var',
        name: 'Potentially Unused Variable',
        pattern: /const\s+\w+\s*=/,
        type: 'anti-pattern',
        language: 'typescript',
        frequency: 0,
        severity: 'medium',
        suggestion: 'Check if variable is actually used in the scope',
      },
      {
        id: 'magic-numbers',
        name: 'Magic Numbers',
        pattern: /[^a-zA-Z0-9_](0|1|100|1000|60|3600)\s*[=,;)]/,
        type: 'anti-pattern',
        language: 'typescript',
        frequency: 0,
        severity: 'medium',
        suggestion: 'Extract magic numbers to named constants',
      },
    ];

    patterns.forEach((pattern) => {
      this.patterns.set(pattern.id, pattern);
    });
  }

  public analyzeCode(code: string, file: string, language: string = 'typescript'): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const lines = code.split('\n');

    this.patterns.forEach((pattern) => {
      if (pattern.language !== language) return;

      const regex = typeof pattern.pattern === 'string' ? new RegExp(pattern.pattern, 'g') : pattern.pattern;

      lines.forEach((line, lineIndex) => {
        const lineMatches = line.matchAll(regex);
        for (const match of lineMatches) {
          matches.push({
            patternId: pattern.id,
            patternName: pattern.name,
            file,
            line: lineIndex + 1,
            code: line.trim(),
            type: pattern.type,
            severity: pattern.severity,
            suggestion: pattern.suggestion,
          });

          pattern.frequency++;
        }
      });
    });

    // Record analysis
    this.analysisHistory.push({
      file,
      timestamp: Date.now(),
      matches,
    });

    // Keep history reasonable
    if (this.analysisHistory.length > 100) {
      this.analysisHistory = this.analysisHistory.slice(-100);
    }

    return matches;
  }

  public detectImprovements(matches: PatternMatch[]): {
    critical: PatternMatch[];
    improvements: string[];
    score: number;
  } {
    const criticalMatches = matches.filter((m) => m.severity === 'critical' && m.type === 'anti-pattern');
    const improvements: string[] = [];
    let score = 100;

    const severityPenalty: Record<string, number> = {
      low: 5,
      medium: 15,
      high: 25,
      critical: 40,
    };

    matches.forEach((match) => {
      if (match.type === 'anti-pattern') {
        score -= severityPenalty[match.severity] || 0;
        improvements.push(`[Line ${match.line}] ${match.suggestion}`);
      }
    });

    // Count positive patterns as bonus
    const positiveMatches = matches.filter((m) => m.type === 'positive').length;
    score = Math.min(100, score + positiveMatches * 2);

    return {
      critical: criticalMatches,
      improvements,
      score: Math.max(0, score),
    };
  }

  public getPatternFrequency(): Record<string, number> {
    const frequency: Record<string, number> = {};

    this.patterns.forEach((pattern) => {
      frequency[pattern.name] = pattern.frequency;
    });

    return frequency;
  }

  public getCommonIssues(limit: number = 5): PatternMatch[] {
    return this.analysisHistory
      .flatMap((analysis) => analysis.matches)
      .filter((match) => match.type === 'anti-pattern')
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, limit);
  }

  public suggestRefactoring(matches: PatternMatch[]): string[] {
    const suggestions: string[] = [];
    const groupedByType = new Map<string, PatternMatch[]>();

    matches.forEach((match) => {
      if (!groupedByType.has(match.patternName)) {
        groupedByType.set(match.patternName, []);
      }
      groupedByType.get(match.patternName)!.push(match);
    });

    groupedByType.forEach((patternMatches, patternName) => {
      const count = patternMatches.length;
      const suggestion = patternMatches[0].suggestion;

      if (count > 1) {
        suggestions.push(`${patternName} appears ${count} times - ${suggestion}`);
      } else {
        suggestions.push(`${suggestion}`);
      }
    });

    return suggestions;
  }

  public addPattern(pattern: CodePattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  public getPattern(id: string): CodePattern | undefined {
    return this.patterns.get(id);
  }

  public getAllPatterns(): CodePattern[] {
    return Array.from(this.patterns.values());
  }

  public getAnalysisHistory(limit: number = 10): typeof this.analysisHistory {
    return this.analysisHistory.slice(-limit);
  }
}

export default CodePatternAnalyzer;
