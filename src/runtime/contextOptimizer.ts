/**
 * Adaptive context optimizer
 * Intelligently manages context size and relevance for maximum efficiency
 */

export interface ContextWindowAnalysis {
    totalTokens: number;
    usagePercentage: number;
    redundancy: number;
    relevanceScore: number;
    recommendations: string[];
}

export class ContextOptimizer {
    private tokenEstimator = 0.25; // 1 token ≈ 4 characters average
    private minRelevance = 0.5;
    private contextHistory: string[] = [];

    analyzeContext(context: string, maxTokens: number): ContextWindowAnalysis {
        const estimatedTokens = Math.ceil(context.length * this.tokenEstimizer);
        const usagePercentage = (estimatedTokens / maxTokens) * 100;
        
        const redundancy = this.calculateRedundancy(context);
        const relevanceScore = this.estimateRelevance(context);
        const recommendations = this.generateRecommendations(
            estimatedTokens,
            maxTokens,
            redundancy,
            relevanceScore
        );

        return {
            totalTokens: estimatedTokens,
            usagePercentage,
            redundancy,
            relevanceScore,
            recommendations,
        };
    }

    compressContext(context: string, targetTokens: number): string {
        const currentTokens = Math.ceil(context.length * this.tokenEstimator);
        if (currentTokens <= targetTokens) {
            return context;
        }

        // 1. Remove redundant lines
        let compressed = this.removeRedundantLines(context);

        // 2. Summarize large blocks
        const targetSize = Math.ceil(targetTokens / this.tokenEstimator);
        if (compressed.length > targetSize) {
            compressed = this.summarizeLargeBlocks(compressed, targetSize);
        }

        // 3. Extract key information
        if (compressed.length > targetSize * 0.8) {
            compressed = this.extractKeyInformation(compressed, targetSize);
        }

        return compressed;
    }

    private calculateRedundancy(context: string): number {
        const lines = context.split('\n');
        const uniqueLines = new Set(lines);
        return 1 - (uniqueLines.size / lines.length);
    }

    private estimateRelevance(context: string): number {
        // Simple relevance heuristic based on content patterns
        const codePatterns = (context.match(/[\{\}\(\)\[\]]/g) || []).length;
        const commentPatterns = (context.match(/\/\/|\/\*|\*\//g) || []).length;
        const importPatterns = (context.match(/import|require|from/g) || []).length;

        const score = (codePatterns + commentPatterns + importPatterns) / context.length;
        return Math.min(1, Math.max(0, score));
    }

    private removeRedundantLines(context: string): string {
        const lines = context.split('\n');
        const seen = new Set<string>();
        const result: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !seen.has(trimmed)) {
                seen.add(trimmed);
                result.push(line);
            }
        }

        return result.join('\n');
    }

    private summarizeLargeBlocks(context: string, targetSize: number): string {
        const blocks = context.split('\n\n');
        const summaries: string[] = [];

        for (const block of blocks) {
            if (block.length > 500) {
                // Summarize large block
                const lines = block.split('\n');
                const summary = [
                    lines[0],
                    `... [${lines.length} lines] ...`,
                    lines[lines.length - 1],
                ].join('\n');
                summaries.push(summary);
            } else {
                summaries.push(block);
            }
        }

        return summaries.join('\n\n').substring(0, targetSize);
    }

    private extractKeyInformation(context: string, targetSize: number): string {
        // Extract lines containing important keywords
        const keywords = ['function', 'class', 'interface', 'export', 'const', 'let', 'return'];
        const lines = context.split('\n');
        const important: string[] = [];

        for (const line of lines) {
            const lower = line.toLowerCase();
            if (keywords.some(kw => lower.includes(kw))) {
                important.push(line);
            }
        }

        return important.join('\n').substring(0, targetSize);
    }

    private generateRecommendations(
        tokens: number,
        maxTokens: number,
        redundancy: number,
        relevance: number
    ): string[] {
        const recommendations: string[] = [];

        if (tokens > maxTokens * 0.9) {
            recommendations.push('Context window usage is very high. Consider breaking down the task.');
        }

        if (redundancy > 0.3) {
            recommendations.push('High redundancy detected. Remove duplicate lines or consolidate blocks.');
        }

        if (relevance < 0.5) {
            recommendations.push('Context relevance is low. Focus on the most critical parts.');
        }

        if (tokens > maxTokens * 0.7 && redundancy < 0.1) {
            recommendations.push('Context is comprehensive. Consider using semantic search to find relevant sections.');
        }

        return recommendations;
    }

    recordContextUsage(context: string): void {
        if (this.contextHistory.length >= 100) {
            this.contextHistory.shift();
        }
        this.contextHistory.push(context);
    }

    getContextTrends(): { avgSize: number; maxSize: number; growth: number } {
        if (this.contextHistory.length === 0) {
            return { avgSize: 0, maxSize: 0, growth: 0 };
        }

        const sizes = this.contextHistory.map(c => c.length);
        const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        const maxSize = Math.max(...sizes);
        const growth = this.contextHistory.length > 1
            ? (sizes[sizes.length - 1] - sizes[0]) / sizes[0]
            : 0;

        return { avgSize, maxSize, growth };
    }
}

export const globalContextOptimizer = new ContextOptimizer();
