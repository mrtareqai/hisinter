"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PrioritizationEngine {
    history = [];
    weights = {
        impact: 0.30,
        urgency: 0.25,
        cost: -0.20,
        complexity: -0.15,
        dependencies: -0.10,
    };
    learningRate = 0.1;
    /**
     * Prioritize goals based on multiple factors
     */
    prioritize(goals, executionOrder) {
        const priorities = [];
        for (const goalId of executionOrder) {
            const goal = goals.find((g) => g.id === goalId);
            if (!goal)
                continue;
            const factors = this.calculateFactors(goal, goals, executionOrder);
            const score = this.calculateScore(factors);
            priorities.push({
                goalId,
                score,
                factors,
                reasoning: this.generateReasoning(goal, factors, score),
            });
        }
        // Sort by score (highest first)
        priorities.sort((a, b) => b.score - a.score);
        // Record in history
        this.history.push({
            timestamp: Date.now(),
            decisions: priorities,
        });
        return priorities;
    }
    /**
     * Calculate individual priority factors for a goal
     */
    calculateFactors(goal, allGoals, executionOrder) {
        // Impact: how many other goals depend on this?
        const dependents = allGoals.filter((g) => g.dependencies.includes(goal.id)).length;
        const impact = Math.min((dependents + 1) / (allGoals.length + 1), 1.0) * 100;
        // Urgency: is it on the critical path? Earlier in execution?
        const positionInOrder = executionOrder.indexOf(goal.id);
        const urgency = (1 - positionInOrder / executionOrder.length) * 100;
        // Cost: estimated effort
        const maxEffort = Math.max(...allGoals.map((g) => g.estimatedEffort));
        const cost = (goal.estimatedEffort / maxEffort) * 100;
        // Complexity: risk level + actual complexity
        const complexityMap = { atomic: 20, simple: 40, moderate: 70, complex: 100 };
        const riskMap = { low: 10, medium: 30, high: 50 };
        const complexity = (complexityMap[goal.complexity] + riskMap[goal.riskLevel]) / 2;
        // Dependencies: how many goals must be done first?
        const dependencies = (goal.dependencies.length / allGoals.length) * 100;
        return { impact, urgency, cost, complexity, dependencies };
    }
    /**
     * Calculate composite priority score
     */
    calculateScore(factors) {
        const score = factors.impact * this.weights.impact +
            factors.urgency * this.weights.urgency +
            factors.cost * this.weights.cost +
            factors.complexity * this.weights.complexity +
            factors.dependencies * this.weights.dependencies;
        // Normalize to 0-100
        return Math.max(0, Math.min(100, score + 50));
    }
    /**
     * Generate human-readable reasoning for priority
     */
    generateReasoning(goal, factors, score) {
        const reasons = [];
        if (factors.impact > 60) {
            reasons.push('High impact on other goals');
        }
        if (factors.urgency > 70) {
            reasons.push('High priority in execution order');
        }
        if (factors.cost < 30) {
            reasons.push('Low effort required');
        }
        if (factors.complexity > 60) {
            reasons.push('Higher complexity - prioritize for focus');
        }
        if (factors.dependencies > 50) {
            reasons.push('Blocked by many dependencies - defer');
        }
        if (reasons.length === 0) {
            reasons.push('Standard priority');
        }
        return reasons.join('; ');
    }
    /**
     * Get recommended execution queue
     */
    getExecutionQueue(priorities) {
        return priorities.map((p) => p.goalId);
    }
    /**
     * Adjust weights based on user feedback
     */
    learnFromFeedback(feedback, confidence = 0.5) {
        // feedback: goalId -> adjustment factor (-1 to 1)
        const adjustment = this.learningRate * confidence;
        // Adjust weights based on patterns in feedback
        let impactFeedback = 0;
        let costFeedback = 0;
        for (const [goalId, feedback_value] of Object.entries(feedback)) {
            if (feedback_value > 0) {
                impactFeedback += feedback_value;
            }
            else {
                costFeedback -= feedback_value;
            }
        }
        // Update weights (with decay to maintain stability)
        this.weights.impact = 0.9 * this.weights.impact + 0.1 * Math.max(0.1, impactFeedback);
        this.weights.cost = 0.9 * this.weights.cost + 0.1 * Math.min(-0.1, costFeedback);
        // Normalize weights
        const sum = Math.abs(this.weights.impact +
            this.weights.urgency +
            this.weights.cost +
            this.weights.complexity +
            this.weights.dependencies);
        const scale = 1.0 / sum;
        for (const key in this.weights) {
            this.weights[key] *= scale;
        }
    }
    /**
     * Get priority statistics
     */
    getStatistics() {
        if (this.history.length === 0) {
            return {
                averageScore: 0,
                scoreVariance: 0,
                mostFrequentlyHighPriority: '',
                avgPrioritizationTime: 0,
                decisionCount: 0,
            };
        }
        const allScores = this.history.flatMap((h) => h.decisions.map((p) => p.score));
        const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        const variance = allScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) /
            allScores.length;
        const topGoals = {};
        for (const history of this.history) {
            const topGoal = history.decisions[0];
            topGoals[topGoal.goalId] = (topGoals[topGoal.goalId] || 0) + 1;
        }
        const mostFrequent = Object.entries(topGoals).sort((a, b) => b[1] - a[1])[0];
        return {
            averageScore: avgScore,
            scoreVariance: variance,
            mostFrequentlyHighPriority: mostFrequent?.[0] || '',
            avgPrioritizationTime: 10, // placeholder
            decisionCount: this.history.length,
        };
    }
    /**
     * Detect priority conflicts or anomalies
     */
    detectAnomalies(currentPriorities, previousPriorities) {
        const shiftedRanking = [];
        if (previousPriorities) {
            for (let i = 0; i < currentPriorities.length; i++) {
                const current = currentPriorities[i];
                const oldIndex = previousPriorities.findIndex((p) => p.goalId === current.goalId);
                if (oldIndex !== -1 && Math.abs(oldIndex - i) > 3) {
                    shiftedRanking.push({
                        goalId: current.goalId,
                        oldRank: oldIndex,
                        newRank: i,
                    });
                }
            }
        }
        const avgScore = currentPriorities.reduce((sum, p) => sum + p.score, 0) / currentPriorities.length;
        const stdDev = Math.sqrt(currentPriorities.reduce((sum, p) => sum + Math.pow(p.score - avgScore, 2), 0) /
            currentPriorities.length);
        const scoreOutliers = currentPriorities.filter((p) => Math.abs(p.score - avgScore) > 2 * stdDev);
        const inconsistencies = [];
        for (const priority of currentPriorities) {
            if (priority.factors.impact > 70 && priority.score < 40) {
                inconsistencies.push(`Goal ${priority.goalId} has high impact but low priority score`);
            }
        }
        return { shiftedRanking, scoreOutliers, inconsistencies };
    }
    /**
     * Export prioritization history for analytics
     */
    getHistory() {
        return this.history;
    }
    /**
     * Clear history (for testing or reset)
     */
    clearHistory() {
        this.history = [];
    }
    /**
     * Get weight configuration
     */
    getWeights() {
        return { ...this.weights };
    }
    /**
     * Set weight configuration
     */
    setWeights(weights) {
        this.weights = { ...this.weights, ...weights };
    }
}
exports.default = PrioritizationEngine;
//# sourceMappingURL=prioritizationEngine.js.map