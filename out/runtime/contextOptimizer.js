"use strict";
/**
 * Adaptive context optimizer
 * Intelligently manages context size and relevance for maximum efficiency
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalContextOptimizer = exports.ContextOptimizer = void 0;
class ContextOptimizer {
    tokenEstimator = 0.25; // 1 token ≈ 4 characters average
    minRelevance = 0.5;
    contextHistory = [];
    analyzeContext(context, maxTokens) {
        const estimatedTokens = Math.ceil(context.length * this.tokenEstimizer);
        const usagePercentage = (estimatedTokens / maxTokens) * 100;
        const redundancy = this.calculateRedundancy(context);
        const relevanceScore = this.estimateRelevance(context);
        const recommendations = this.generateRecommendations(estimatedTokens, maxTokens, redundancy, relevanceScore);
        return {
            totalTokens: estimatedTokens,
            usagePercentage,
            redundancy,
            relevanceScore,
            recommendations,
        };
    }
    compressContext(context, targetTokens) {
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
    calculateRedundancy(context) {
        const lines = context.split('\n');
        const uniqueLines = new Set(lines);
        return 1 - (uniqueLines.size / lines.length);
    }
    estimateRelevance(context) {
        // Simple relevance heuristic based on content patterns
        const codePatterns = (context.match(/[\{\}\(\)\[\]]/g) || []).length;
        const commentPatterns = (context.match(/\/\/|\/\*|\*\//g) || []).length;
        const importPatterns = (context.match(/import|require|from/g) || []).length;
        const score = (codePatterns + commentPatterns + importPatterns) / context.length;
        return Math.min(1, Math.max(0, score));
    }
    removeRedundantLines(context) {
        const lines = context.split('\n');
        const seen = new Set();
        const result = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !seen.has(trimmed)) {
                seen.add(trimmed);
                result.push(line);
            }
        }
        return result.join('\n');
    }
    summarizeLargeBlocks(context, targetSize) {
        const blocks = context.split('\n\n');
        const summaries = [];
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
            }
            else {
                summaries.push(block);
            }
        }
        return summaries.join('\n\n').substring(0, targetSize);
    }
    extractKeyInformation(context, targetSize) {
        // Extract lines containing important keywords
        const keywords = ['function', 'class', 'interface', 'export', 'const', 'let', 'return'];
        const lines = context.split('\n');
        const important = [];
        for (const line of lines) {
            const lower = line.toLowerCase();
            if (keywords.some(kw => lower.includes(kw))) {
                important.push(line);
            }
        }
        return important.join('\n').substring(0, targetSize);
    }
    generateRecommendations(tokens, maxTokens, redundancy, relevance) {
        const recommendations = [];
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
    recordContextUsage(context) {
        if (this.contextHistory.length >= 100) {
            this.contextHistory.shift();
        }
        this.contextHistory.push(context);
    }
    getContextTrends() {
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
exports.ContextOptimizer = ContextOptimizer;
exports.globalContextOptimizer = new ContextOptimizer();
//# sourceMappingURL=contextOptimizer.js.map