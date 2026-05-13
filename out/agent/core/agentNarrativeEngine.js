"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentNarrativeEngine = void 0;
/**
 * AgentNarrativeEngine
 * Generates unified, coherent narrative for all agent operations
 * No panel-switching language, single seamless story
 */
class AgentNarrativeEngine {
    narrativeHistory;
    narrativeTemplates = {
        thinking: `I'm analyzing: "${this.escapeQuotes('{input}')}". Breaking this down into achievable steps...`,
        decomposed: `I've identified {count} key steps: {steps}. Let me prioritize and execute.`,
        questioning: `I need clarification on one thing: {question}`,
        executing: `Now executing: {step}. This should take about {duration}ms.`,
        toolSelected: `Using {tool} to accomplish: {task}`,
        progress: `Progress: {percentage}% complete. {status}`,
        success: `Successfully completed: {task}. Here's what was accomplished: {result}`,
        error: `Encountered an issue: {error}. Attempting recovery...`,
        completed: `All done! Summary: {summary}`,
        learningUpdate: `Learning from this: {insight}. Next time will be {improvement}%  better.`,
    };
    constructor() {
        this.narrativeHistory = [];
    }
    /**
     * Generate thinking narrative
     */
    generateThinkingNarrative(input) {
        return this.interpolate(this.narrativeTemplates.thinking, { input });
    }
    /**
     * Generate decomposition narrative
     */
    generateDecomposedNarrative(steps, priorities) {
        const stepList = steps.slice(0, 3).join(', ');
        return this.interpolate(this.narrativeTemplates.decomposed, {
            count: steps.length,
            steps: stepList,
        });
    }
    /**
     * Generate question narrative
     */
    generateQuestionNarrative(question) {
        return this.interpolate(this.narrativeTemplates.questioning, {
            question,
        });
    }
    /**
     * Generate execution narrative
     */
    generateExecutionNarrative(step, estimatedDuration) {
        return this.interpolate(this.narrativeTemplates.executing, {
            step,
            duration: estimatedDuration,
        });
    }
    /**
     * Generate tool selection narrative
     */
    generateToolNarrative(tool, task) {
        return this.interpolate(this.narrativeTemplates.toolSelected, {
            tool,
            task,
        });
    }
    /**
     * Generate progress narrative
     */
    generateProgressNarrative(completed, total, status) {
        const percentage = Math.round((completed / total) * 100);
        return this.interpolate(this.narrativeTemplates.progress, {
            percentage,
            status,
        });
    }
    /**
     * Generate success narrative
     */
    generateSuccessNarrative(task, result) {
        return this.interpolate(this.narrativeTemplates.success, {
            task,
            result: result.substring(0, 100),
        });
    }
    /**
     * Generate error narrative with recovery
     */
    generateErrorNarrative(error) {
        return this.interpolate(this.narrativeTemplates.error, {
            error,
        });
    }
    /**
     * Generate completion narrative
     */
    generateCompletionNarrative(summary) {
        const summaryText = Object.entries(summary)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        return this.interpolate(this.narrativeTemplates.completed, {
            summary: summaryText.substring(0, 100),
        });
    }
    /**
     * Generate learning narrative
     */
    generateLearningNarrative(insight, improvementPercent) {
        return this.interpolate(this.narrativeTemplates.learningUpdate, {
            insight,
            improvement: improvementPercent,
        });
    }
    /**
     * Record narrative for history
     */
    recordNarrative(stage, narrative, metadata) {
        this.narrativeHistory.push({
            timestamp: Date.now(),
            stage,
            narrative,
            metadata: metadata || {},
        });
    }
    /**
     * Get full narrative arc
     */
    getNarrativeArc() {
        return this.narrativeHistory.map((entry) => ({
            stage: entry.stage,
            narrative: entry.narrative,
        }));
    }
    /**
     * Get recent narratives
     */
    getRecentNarratives(limit = 5) {
        return this.narrativeHistory
            .slice(-limit)
            .map((entry) => entry.narrative);
    }
    /**
     * Clear history
     */
    clearHistory() {
        this.narrativeHistory = [];
    }
    /**
     * Helper: interpolate variables in templates
     */
    interpolate(template, vars) {
        let result = template;
        for (const [key, value] of Object.entries(vars)) {
            result = result.replace(`{${key}}`, String(value));
        }
        return result;
    }
    /**
     * Helper: escape quotes in strings
     */
    escapeQuotes(str) {
        return str.replace(/"/g, '\\"');
    }
    /**
     * Generate full conversation context
     */
    getConversationContext() {
        const latest = this.narrativeHistory[this.narrativeHistory.length - 1];
        return {
            currentNarrative: latest?.narrative || 'Ready to help',
            history: this.getRecentNarratives(3),
            stage: latest?.stage || 'idle',
        };
    }
}
exports.AgentNarrativeEngine = AgentNarrativeEngine;
exports.default = AgentNarrativeEngine;
//# sourceMappingURL=agentNarrativeEngine.js.map