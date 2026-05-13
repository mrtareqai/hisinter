"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolIntelligence = void 0;
class ToolIntelligence {
    tools = new Map();
    executionHistory = [];
    toolCombinationCache = new Map();
    constructor() {
        this.initializeDefaultTools();
    }
    initializeDefaultTools() {
        const defaultTools = [
            {
                id: 'bash',
                name: 'Bash Shell',
                capabilities: ['file-operations', 'command-execution', 'system-access'],
                successRate: 0.92,
                averageExecutionTime: 2000,
                costFactor: 1,
            },
            {
                id: 'file-tool',
                name: 'File Tool',
                capabilities: ['file-reading', 'file-writing', 'file-management'],
                successRate: 0.98,
                averageExecutionTime: 500,
                costFactor: 0.5,
            },
            {
                id: 'code-analyzer',
                name: 'Code Analyzer',
                capabilities: ['ast-parsing', 'pattern-detection', 'code-quality'],
                successRate: 0.95,
                averageExecutionTime: 1500,
                costFactor: 0.8,
            },
            {
                id: 'browser-tool',
                name: 'Browser Tool',
                capabilities: ['web-interaction', 'screenshot', 'form-filling'],
                successRate: 0.85,
                averageExecutionTime: 3000,
                costFactor: 1.2,
            },
            {
                id: 'api-client',
                name: 'API Client',
                capabilities: ['http-request', 'api-integration', 'data-fetching'],
                successRate: 0.9,
                averageExecutionTime: 2500,
                costFactor: 1.1,
            },
        ];
        defaultTools.forEach((tool) => {
            this.tools.set(tool.id, tool);
        });
    }
    selectOptimalTool(task, requiredCapabilities) {
        const scores = [];
        this.tools.forEach((tool) => {
            const score = this.computeToolScore(tool, requiredCapabilities);
            scores.push(score);
        });
        return scores.sort((a, b) => b.score - a.score);
    }
    computeToolScore(tool, requiredCapabilities) {
        let score = 0;
        // Capability matching
        const matchedCapabilities = requiredCapabilities.filter((cap) => tool.capabilities.includes(cap));
        const capabilityMatch = (matchedCapabilities.length / requiredCapabilities.length) * 0.5;
        score += capabilityMatch;
        // Success rate factor
        score += tool.successRate * 0.3;
        // Efficiency factor (inverse of cost)
        score += (1 - tool.costFactor / 2) * 0.2;
        // Recent performance bonus
        const recentSuccesses = this.executionHistory
            .filter((h) => h.toolId === tool.id && h.success)
            .slice(-5).length;
        const performanceBonus = (recentSuccesses / 5) * 0.1;
        score += performanceBonus;
        const recommendation = this.getRecommendation(score);
        return {
            toolId: tool.id,
            score: Math.min(1, score),
            reasons: this.getScoreReasons(tool, requiredCapabilities, matchedCapabilities),
            recommendation,
        };
    }
    getRecommendation(score) {
        if (score >= 0.8)
            return 'primary';
        if (score >= 0.6)
            return 'secondary';
        if (score >= 0.4)
            return 'fallback';
        return 'not-recommended';
    }
    getScoreReasons(tool, requiredCapabilities, matchedCapabilities) {
        const reasons = [];
        if (matchedCapabilities.length === requiredCapabilities.length) {
            reasons.push('Matches all required capabilities');
        }
        else if (matchedCapabilities.length > 0) {
            reasons.push(`Matches ${matchedCapabilities.length}/${requiredCapabilities.length} capabilities`);
        }
        if (tool.successRate > 0.95) {
            reasons.push(`High success rate: ${(tool.successRate * 100).toFixed(0)}%`);
        }
        if (tool.costFactor < 0.8) {
            reasons.push('Low cost factor - efficient execution');
        }
        const recentSuccessRate = this.getRecentSuccessRate(tool.id);
        if (recentSuccessRate > 0.9) {
            reasons.push(`Recent performance excellent: ${(recentSuccessRate * 100).toFixed(0)}%`);
        }
        return reasons;
    }
    buildToolChain(tasks) {
        const tools = [];
        const executionOrder = [];
        let totalCost = 0;
        let successProbability = 1;
        tasks.forEach((task) => {
            const scores = this.selectOptimalTool(task.task, task.capabilities);
            const primary = scores.find((s) => s.recommendation === 'primary');
            if (primary) {
                tools.push(primary.toolId);
                executionOrder.push(primary.toolId);
                const tool = this.tools.get(primary.toolId);
                if (tool) {
                    totalCost += tool.costFactor;
                    successProbability *= tool.successRate;
                }
            }
        });
        const fallbackChain = this.buildFallbackChain(tools);
        return {
            tools: [...new Set(tools)],
            executionOrder,
            fallbackChain,
            estimatedCost: totalCost,
            estimatedSuccessRate: successProbability,
        };
    }
    buildFallbackChain(primaryTools) {
        const allTools = Array.from(this.tools.keys());
        return allTools.filter((id) => !primaryTools.includes(id)).slice(0, primaryTools.length);
    }
    recordExecution(toolId, success, duration) {
        this.executionHistory.push({
            toolId,
            success,
            duration,
            timestamp: Date.now(),
        });
        // Update tool metrics
        const tool = this.tools.get(toolId);
        if (tool) {
            const allExecutions = this.executionHistory.filter((h) => h.toolId === toolId);
            const successCount = allExecutions.filter((h) => h.success).length;
            tool.successRate = successCount / allExecutions.length;
            tool.averageExecutionTime = allExecutions.reduce((sum, h) => sum + h.duration, 0) / allExecutions.length;
        }
        // Invalidate cache on new data
        this.toolCombinationCache.clear();
    }
    getRecentSuccessRate(toolId) {
        const recent = this.executionHistory
            .filter((h) => h.toolId === toolId)
            .slice(-10);
        if (recent.length === 0)
            return 0.5;
        const successes = recent.filter((h) => h.success).length;
        return successes / recent.length;
    }
    addTool(tool) {
        this.tools.set(tool.id, tool);
        this.toolCombinationCache.clear();
    }
    getTool(id) {
        return this.tools.get(id);
    }
    getAllTools() {
        return Array.from(this.tools.values());
    }
    getExecutionMetrics() {
        if (this.executionHistory.length === 0) {
            return {
                totalExecutions: 0,
                successRate: 0,
                averageTime: 0,
                mostUsedTool: '',
            };
        }
        const successCount = this.executionHistory.filter((h) => h.success).length;
        const avgTime = this.executionHistory.reduce((sum, h) => sum + h.duration, 0) / this.executionHistory.length;
        const toolUsage = new Map();
        this.executionHistory.forEach((h) => {
            toolUsage.set(h.toolId, (toolUsage.get(h.toolId) || 0) + 1);
        });
        const mostUsed = Array.from(toolUsage.entries()).sort((a, b) => b[1] - a[1])[0];
        return {
            totalExecutions: this.executionHistory.length,
            successRate: successCount / this.executionHistory.length,
            averageTime: avgTime,
            mostUsedTool: mostUsed?.[0] || '',
        };
    }
}
exports.ToolIntelligence = ToolIntelligence;
exports.default = ToolIntelligence;
//# sourceMappingURL=toolIntelligence.js.map