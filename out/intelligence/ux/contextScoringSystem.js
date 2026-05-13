"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextScoringSystem = void 0;
class ContextScoringSystem {
    elementCache = new Map();
    queryCache = new Map();
    calculateRelevance(query, elements) {
        const cacheKey = `${query}:${elements.map((e) => e.id).join(',')}`;
        if (this.queryCache.has(cacheKey)) {
            return this.queryCache.get(cacheKey);
        }
        const scores = elements.map((element) => {
            const score = this.computeRelevanceScore(query, element);
            const priority = this.prioritizeElement(score);
            const estimatedTokenCost = this.estimateTokenCost(element);
            return {
                elementId: element.id,
                score,
                reasons: this.getRelevanceReasons(query, element, score),
                priority,
                estimatedTokenCost,
            };
        });
        // Sort by score descending
        const sorted = scores.sort((a, b) => b.score - a.score);
        this.queryCache.set(cacheKey, sorted);
        // Keep cache size reasonable
        if (this.queryCache.size > 100) {
            const firstKey = this.queryCache.keys().next().value;
            this.queryCache.delete(firstKey);
        }
        return sorted;
    }
    computeRelevanceScore(query, element) {
        let score = 0;
        const queryLower = query.toLowerCase();
        const nameLower = element.name.toLowerCase();
        const contentLower = element.content.toLowerCase();
        // Exact name match: 0.5
        if (nameLower === queryLower) {
            score += 0.5;
        }
        // Name contains query: 0.3
        else if (nameLower.includes(queryLower)) {
            score += 0.3;
        }
        // Query terms in content
        const queryTerms = queryLower.split(/\s+/);
        const matchedTerms = queryTerms.filter((term) => contentLower.includes(term)).length;
        const termMatchScore = (matchedTerms / queryTerms.length) * 0.4;
        score += termMatchScore;
        // Type relevance boost
        if (element.type === 'function' || element.type === 'class') {
            score += 0.1;
        }
        // Recency bonus
        const ageInDays = (Date.now() - element.lastModified) / (1000 * 60 * 60 * 24);
        const recencyBonus = Math.max(0, 0.05 * (1 - ageInDays / 30));
        score += recencyBonus;
        return Math.min(1, score);
    }
    prioritizeElement(score) {
        if (score >= 0.8)
            return 'critical';
        if (score >= 0.6)
            return 'high';
        if (score >= 0.4)
            return 'medium';
        return 'low';
    }
    getRelevanceReasons(query, element, score) {
        const reasons = [];
        if (element.name.toLowerCase().includes(query.toLowerCase())) {
            reasons.push(`Name matches query: "${element.name}"`);
        }
        if (element.content.toLowerCase().includes(query.toLowerCase())) {
            reasons.push(`Content contains query term`);
        }
        if (element.type === 'function' || element.type === 'class') {
            reasons.push(`${element.type} definition - typically relevant`);
        }
        if (score >= 0.8) {
            reasons.push(`High relevance match (${(score * 100).toFixed(0)}%)`);
        }
        return reasons;
    }
    estimateTokenCost(element) {
        // Rough estimate: ~4 characters per token
        return Math.ceil(element.lineCount * 50 / 4);
    }
    pruneContext(scores, maxTokens) {
        let totalTokens = 0;
        const selected = [];
        // Always include critical elements
        scores
            .filter((s) => s.priority === 'critical')
            .forEach((score) => {
            selected.push(score);
            totalTokens += score.estimatedTokenCost;
        });
        // Then include high priority
        scores
            .filter((s) => s.priority === 'high' && !selected.includes(s))
            .forEach((score) => {
            if (totalTokens + score.estimatedTokenCost <= maxTokens) {
                selected.push(score);
                totalTokens += score.estimatedTokenCost;
            }
        });
        // Finally include medium priority
        scores
            .filter((s) => s.priority === 'medium' && !selected.includes(s))
            .forEach((score) => {
            if (totalTokens + score.estimatedTokenCost <= maxTokens) {
                selected.push(score);
                totalTokens += score.estimatedTokenCost;
            }
        });
        return selected;
    }
    getTopRelevantElements(scores, limit = 5) {
        return scores.slice(0, limit);
    }
    analyzeContextQuality(scores) {
        const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;
        const criticalCount = scores.filter((s) => s.priority === 'critical').length;
        const totalTokens = scores.reduce((sum, s) => sum + s.estimatedTokenCost, 0);
        const coverage = Math.min(1, avgScore);
        const clarity = Math.min(1, criticalCount / Math.max(1, scores.length));
        const efficiency = totalTokens > 0 ? 1 / (1 + totalTokens / 10000) : 1;
        const recommendations = [];
        if (coverage < 0.5) {
            recommendations.push('Low context coverage - consider refining search query');
        }
        if (clarity < 0.3) {
            recommendations.push('Too few critical elements - query may be too specific');
        }
        if (efficiency < 0.3) {
            recommendations.push('High token cost - consider pruning or filtering context');
        }
        if (avgScore > 0.8 && totalTokens < 5000) {
            recommendations.push('Excellent context selection - proceed with confidence');
        }
        return {
            coverage,
            clarity,
            efficiency,
            recommendations,
        };
    }
    registerElement(element) {
        this.elementCache.set(element.id, element);
    }
    getElement(id) {
        return this.elementCache.get(id);
    }
}
exports.ContextScoringSystem = ContextScoringSystem;
exports.default = ContextScoringSystem;
//# sourceMappingURL=contextScoringSystem.js.map