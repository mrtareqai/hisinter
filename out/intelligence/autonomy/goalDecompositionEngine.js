"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class GoalDecompositionEngine {
    goalCounter = 0;
    complexityThresholds = {
        atomic: 5, // < 5 minutes = atomic
        simple: 15, // < 15 minutes = simple
        moderate: 60, // < 60 minutes = moderate
        complex: Infinity, // > 60 minutes = complex
    };
    /**
     * Decompose a high-level goal into atomic sub-goals
     */
    decompose(userGoal) {
        const rootGoal = this.createGoal(userGoal, 'High-level user goal', this.analyzeComplexity(userGoal), []);
        const allGoals = new Map();
        allGoals.set(rootGoal.id, rootGoal);
        // Recursively decompose
        this.decomposeRecursive(rootGoal, allGoals, 0);
        // Calculate execution order
        const executionOrder = this.topologicalSort(allGoals);
        // Identify critical path
        const criticalPath = this.findCriticalPath(allGoals, executionOrder);
        // Calculate totals
        const totalEffort = Array.from(allGoals.values()).reduce((sum, g) => sum + g.estimatedEffort, 0);
        return {
            root: rootGoal,
            allGoals,
            executionOrder,
            criticalPath,
            totalEstimatedEffort: totalEffort,
            overallComplexity: this.determineComplexity(totalEffort),
        };
    }
    /**
     * Recursively decompose a goal until all are atomic
     */
    decomposeRecursive(goal, allGoals, depth, maxDepth = 8) {
        // Don't decompose if already atomic
        if (goal.complexity === 'atomic' || depth >= maxDepth) {
            return;
        }
        // Generate sub-goals based on goal type and complexity
        const subGoals = this.generateSubGoals(goal, depth);
        for (const subGoal of subGoals) {
            allGoals.set(subGoal.id, subGoal);
            goal.children.push(subGoal.id);
            subGoal.parent = goal.id;
            // Recursively decompose if not atomic
            if (subGoal.complexity !== 'atomic') {
                this.decomposeRecursive(subGoal, allGoals, depth + 1, maxDepth);
            }
        }
    }
    /**
     * Generate sub-goals for a given goal
     */
    generateSubGoals(parentGoal, depth) {
        const subGoals = [];
        // Pattern: Analysis → Planning → Execution → Verification
        if (depth === 0) {
            // First level: major phases
            subGoals.push(this.createGoal(`Analyze: ${parentGoal.title}`, 'Understand requirements and dependencies', 'simple', ['analysis', parentGoal.tags[0] || 'general']));
            subGoals.push(this.createGoal(`Plan: ${parentGoal.title}`, 'Create detailed execution plan', 'simple', ['planning', parentGoal.tags[0] || 'general']));
            subGoals.push(this.createGoal(`Execute: ${parentGoal.title}`, 'Implement the actual changes', parentGoal.complexity === 'complex' ? 'moderate' : 'simple', ['execution', parentGoal.tags[0] || 'general']));
            subGoals.push(this.createGoal(`Verify: ${parentGoal.title}`, 'Test and validate results', 'simple', ['verification', parentGoal.tags[0] || 'general']));
        }
        else if (depth === 1) {
            // Second level: detailed steps
            if (parentGoal.title.includes('Analyze')) {
                subGoals.push(this.createGoal('Gather requirements', 'Understand what needs to be done', 'atomic', ['analysis']), this.createGoal('Map dependencies', 'Identify affected files and modules', 'atomic', ['analysis']), this.createGoal('Check constraints', 'Verify limitations and blockers', 'atomic', ['analysis']));
            }
            else if (parentGoal.title.includes('Execute')) {
                subGoals.push(this.createGoal('Setup environment', 'Prepare execution context', 'atomic', ['execution']), this.createGoal('Implement changes', 'Apply modifications', 'atomic', ['execution']), this.createGoal('Handle errors', 'Implement error handling', 'atomic', ['execution']));
            }
            else if (parentGoal.title.includes('Verify')) {
                subGoals.push(this.createGoal('Unit tests', 'Run isolated tests', 'atomic', ['verification']), this.createGoal('Integration tests', 'Test component interactions', 'atomic', ['verification']), this.createGoal('Performance check', 'Validate performance metrics', 'atomic', ['verification']));
            }
            else {
                // Generic breakdown for other goals
                subGoals.push(this.createGoal(`Step 1: ${parentGoal.title}`, 'First phase', 'atomic', parentGoal.tags), this.createGoal(`Step 2: ${parentGoal.title}`, 'Second phase', 'atomic', parentGoal.tags));
            }
        }
        // Set dependencies between sub-goals
        if (subGoals.length > 1) {
            for (let i = 1; i < subGoals.length; i++) {
                subGoals[i].dependencies.push(subGoals[i - 1].id);
            }
        }
        return subGoals;
    }
    /**
     * Analyze goal complexity
     */
    analyzeComplexity(goal) {
        const goalLower = goal.toLowerCase();
        let complexity = 'simple';
        // Complexity signals
        if (goalLower.includes('refactor') ||
            goalLower.includes('redesign') ||
            goalLower.includes('architecture')) {
            complexity = 'complex';
        }
        else if (goalLower.includes('add') ||
            goalLower.includes('create') ||
            goalLower.includes('implement')) {
            complexity = 'moderate';
        }
        else if (goalLower.includes('fix') || goalLower.includes('update')) {
            complexity = 'simple';
        }
        else if (goalLower.match(/^(write|read|get|set|check)\s/i)) {
            complexity = 'atomic';
        }
        // Adjust for multiple operations
        const operationCount = (goal.match(/\s(and|then|or|also)\s/gi) || []).length;
        if (operationCount > 2 && complexity === 'atomic')
            complexity = 'simple';
        if (operationCount > 3 && complexity === 'simple')
            complexity = 'moderate';
        return complexity;
    }
    /**
     * Determine complexity from estimated effort
     */
    determineComplexity(effort) {
        if (effort <= this.complexityThresholds.atomic)
            return 'atomic';
        if (effort <= this.complexityThresholds.simple)
            return 'simple';
        if (effort <= this.complexityThresholds.moderate)
            return 'moderate';
        return 'complex';
    }
    /**
     * Create a goal with default values
     */
    createGoal(title, description, complexity, tags) {
        const effortMap = {
            atomic: 3,
            simple: 10,
            moderate: 30,
            complex: 90,
        };
        const riskMap = {
            atomic: 'low',
            simple: 'low',
            moderate: 'medium',
            complex: 'high',
        };
        return {
            id: `goal-${Date.now()}-${this.goalCounter++}`,
            title,
            description,
            complexity,
            estimatedEffort: effortMap[complexity],
            requiredResources: [],
            dependencies: [],
            riskLevel: riskMap[complexity],
            successCriteria: [
                `${title} completed successfully`,
                'All sub-goals completed',
            ],
            tags,
            children: [],
        };
    }
    /**
     * Topological sort: return goals in dependency order
     */
    topologicalSort(goals) {
        const visited = new Set();
        const order = [];
        const visit = (goalId) => {
            if (visited.has(goalId))
                return;
            visited.add(goalId);
            const goal = goals.get(goalId);
            if (!goal)
                return;
            // Visit dependencies first
            for (const depId of goal.dependencies) {
                visit(depId);
            }
            order.push(goalId);
        };
        // Start from all root goals
        for (const goal of goals.values()) {
            if (!goal.parent) {
                visit(goal.id);
            }
        }
        return order;
    }
    /**
     * Find the critical path (longest chain of dependencies)
     */
    findCriticalPath(goals, executionOrder) {
        const pathLengths = new Map();
        // Work backwards from execution order
        for (const goalId of executionOrder.reverse()) {
            const goal = goals.get(goalId);
            if (!goal)
                continue;
            if (goal.children.length === 0) {
                // Leaf node
                pathLengths.set(goalId, goal.estimatedEffort);
            }
            else {
                // Sum children's path lengths
                const maxChildLength = Math.max(...goal.children.map((childId) => pathLengths.get(childId) || 0));
                pathLengths.set(goalId, goal.estimatedEffort + maxChildLength);
            }
        }
        // Reconstruct critical path
        const path = [];
        let current = executionOrder.find((id) => !goals.get(id)?.parent);
        while (current) {
            path.push(current);
            const goal = goals.get(current);
            if (!goal)
                break;
            const nextChild = goal.children.find((childId) => (pathLengths.get(childId) || 0) ===
                Math.max(...goal.children.map((id) => pathLengths.get(id) || 0)));
            current = nextChild;
        }
        return path;
    }
    /**
     * Get goal by ID
     */
    getGoal(tree, goalId) {
        return tree.allGoals.get(goalId);
    }
    /**
     * Mark goal as completed
     */
    markCompleted(tree, goalId) {
        const goal = tree.allGoals.get(goalId);
        if (goal) {
            // Add 'completed' tag if not present
            if (!goal.tags.includes('completed')) {
                goal.tags.push('completed');
            }
        }
    }
    /**
     * Get remaining goals
     */
    getRemainingGoals(tree) {
        return Array.from(tree.allGoals.values()).filter((g) => !g.tags.includes('completed'));
    }
    /**
     * Calculate progress percentage
     */
    getProgress(tree) {
        const total = tree.allGoals.size;
        const completed = Array.from(tree.allGoals.values()).filter((g) => g.tags.includes('completed')).length;
        return {
            completed,
            total,
            percentage: (completed / total) * 100,
        };
    }
}
exports.default = GoalDecompositionEngine;
//# sourceMappingURL=goalDecompositionEngine.js.map