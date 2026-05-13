"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionOptimizer = void 0;
class ExecutionOptimizer {
    pathHistory = [];
    optimizationPatterns = new Map();
    optimizeExecutionPath(originalPath) {
        const optimizedPath = this.generateOptimizedPath(originalPath);
        const improvement = this.calculateImprovement(originalPath, optimizedPath);
        const strategy = this.selectOptimizationStrategy(originalPath);
        return {
            originalPath,
            optimizedPath,
            improvement,
            optimizationStrategy: strategy,
            recommendation: this.generateRecommendation(improvement, strategy),
        };
    }
    generateOptimizedPath(original) {
        let optimized = JSON.parse(JSON.stringify(original));
        // Strategy 1: Parallelize independent steps
        optimized = this.parallelizeSteps(optimized);
        // Strategy 2: Remove redundant steps
        optimized = this.removeRedundancy(optimized);
        // Strategy 3: Reorder for efficiency
        optimized = this.reorderForEfficiency(optimized);
        // Strategy 4: Batch similar operations
        optimized = this.batchOperations(optimized);
        // Calculate new metrics
        optimized.expectedDuration = this.calculateOptimizedDuration(optimized);
        optimized.costFactor = this.calculateOptimizedCost(optimized);
        optimized.successProbability = this.calculateOptimizedSuccess(optimized);
        optimized.complexity = this.calculateComplexity(optimized);
        return optimized;
    }
    parallelizeSteps(path) {
        // Group independent steps that can run in parallel
        const parallelizable = this.identifyParallelizableSteps(path.steps);
        if (parallelizable.length > 1) {
            path.steps = this.mergeParallelSteps(path.steps, parallelizable);
            path.expectedDuration *= 0.7; // 30% time savings from parallelization
        }
        return path;
    }
    identifyParallelizableSteps(steps) {
        // Simple heuristic: steps with same prefix can run in parallel
        const groups = new Map();
        steps.forEach((step) => {
            const prefix = step.split('-')[0];
            if (!groups.has(prefix)) {
                groups.set(prefix, []);
            }
            groups.get(prefix).push(step);
        });
        return Array.from(groups.values()).filter((group) => group.length > 1);
    }
    mergeParallelSteps(steps, parallelizable) {
        const merged = [...steps];
        parallelizable.forEach((group) => {
            const indices = group.map((step) => merged.indexOf(step));
            const minIndex = Math.min(...indices);
            // Replace first step with merged version
            merged[minIndex] = `parallel[${group.join(',')}]`;
            // Remove other steps
            indices.sort((a, b) => b - a);
            indices.slice(1).forEach((idx) => {
                merged.splice(idx, 1);
            });
        });
        return merged;
    }
    removeRedundancy(path) {
        const unique = [...new Set(path.steps)];
        if (unique.length < path.steps.length) {
            const removed = path.steps.length - unique.length;
            path.steps = unique;
            path.costFactor *= (1 - removed * 0.1); // 10% savings per removed step
        }
        return path;
    }
    reorderForEfficiency(path) {
        // Move heavy operations earlier when feasible
        const reordered = [...path.steps];
        // Heuristic: move setup steps to beginning
        const setup = reordered.filter((s) => s.includes('setup'));
        const cleanup = reordered.filter((s) => s.includes('cleanup'));
        const work = reordered.filter((s) => !s.includes('setup') && !s.includes('cleanup'));
        path.steps = [...setup, ...work, ...cleanup];
        path.expectedDuration *= 0.95; // Minor optimization from reordering
        return path;
    }
    batchOperations(path) {
        // Group similar operations to reduce overhead
        const batched = [];
        const seen = new Set();
        path.steps.forEach((step) => {
            const baseOp = step.split('[')[0]; // Get operation type
            if (!seen.has(baseOp)) {
                batched.push(step);
                seen.add(baseOp);
            }
            else {
                // Find existing and batch
                const lastBatchIdx = batched.findIndex((s) => s.includes(baseOp));
                if (lastBatchIdx >= 0) {
                    batched[lastBatchIdx] = `batch[${baseOp}:${batched[lastBatchIdx]},${step}]`;
                }
            }
        });
        path.steps = batched;
        path.costFactor *= 0.85; // 15% cost reduction from batching
        return path;
    }
    calculateOptimizedDuration(path) {
        const baseTime = 1000; // 1s per step on average
        const stepTime = path.steps.length * baseTime;
        // Account for parallelization in step names
        const parallelCount = path.steps.filter((s) => s.startsWith('parallel')).length;
        const parallelReduction = parallelCount * 0.3; // 30% reduction per parallel operation
        return Math.ceil(stepTime * (1 - parallelReduction));
    }
    calculateOptimizedCost(path) {
        return path.costFactor * 0.8; // 20% baseline cost reduction from optimization
    }
    calculateOptimizedSuccess(path) {
        // Better planned paths have higher success rates
        const baseSuccess = 0.85;
        const stepReduction = (10 - path.steps.length) * 0.02; // 2% per step removed
        return Math.min(0.99, baseSuccess + stepReduction);
    }
    calculateComplexity(path) {
        let complexity = path.steps.length * 0.1; // Base complexity
        // Parallelization increases complexity slightly
        const parallelCount = path.steps.filter((s) => s.startsWith('parallel')).length;
        complexity += parallelCount * 0.05;
        return Math.min(1, complexity);
    }
    calculateImprovement(original, optimized) {
        return {
            timeSaved: original.expectedDuration - optimized.expectedDuration,
            costSaved: original.costFactor - optimized.costFactor,
            successIncrease: optimized.successProbability - original.successProbability,
            complexityReduction: original.complexity - optimized.complexity,
        };
    }
    selectOptimizationStrategy(path) {
        if (path.steps.length > 10) {
            return 'decomposition';
        }
        if (path.costFactor > 1.5) {
            return 'cost-reduction';
        }
        if (path.successProbability < 0.8) {
            return 'reliability-improvement';
        }
        return 'balanced-optimization';
    }
    generateRecommendation(improvement, strategy) {
        const timeSavedMs = improvement.timeSaved;
        const costSavedPercent = (improvement.costSaved * 100).toFixed(1);
        const successGainPercent = (improvement.successIncrease * 100).toFixed(1);
        if (timeSavedMs > 5000) {
            return `Use optimized path - save ${(timeSavedMs / 1000).toFixed(1)}s execution time (${strategy})`;
        }
        if (improvement.successIncrease > 0.1) {
            return `Use optimized path - improve success rate by ${successGainPercent}% (${strategy})`;
        }
        if (improvement.costSaved > 0.2) {
            return `Use optimized path - reduce cost by ${costSavedPercent}% (${strategy})`;
        }
        return `Consider optimized path for ${strategy}`;
    }
    recordPathExecution(path, actualDuration, actualCost, success) {
        this.pathHistory.push({
            path,
            actualDuration,
            actualCost,
            success,
        });
        // Update pattern learnings
        const pathKey = path.steps.slice(0, 3).join('-');
        const current = this.optimizationPatterns.get(pathKey) || { avgImprovement: 0, frequency: 0 };
        const improvement = path.expectedDuration - actualDuration;
        current.avgImprovement = (current.avgImprovement * current.frequency + improvement) / (current.frequency + 1);
        current.frequency++;
        this.optimizationPatterns.set(pathKey, current);
        // Keep reasonable history
        if (this.pathHistory.length > 1000) {
            this.pathHistory = this.pathHistory.slice(-1000);
        }
    }
    getOptimizationPatterns() {
        const result = {};
        this.optimizationPatterns.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }
    getExecutionPathStatistics() {
        if (this.pathHistory.length === 0) {
            return { averagePathLength: 0, successRate: 0, averageImprovement: 0 };
        }
        const avgLength = this.pathHistory.reduce((sum, h) => sum + h.path.steps.length, 0) / this.pathHistory.length;
        const successCount = this.pathHistory.filter((h) => h.success).length;
        const successRate = successCount / this.pathHistory.length;
        const avgImprovement = this.pathHistory.reduce((sum, h) => sum + (h.path.expectedDuration - h.actualDuration), 0) / this.pathHistory.length;
        return {
            averagePathLength: avgLength,
            successRate,
            averageImprovement,
        };
    }
}
exports.ExecutionOptimizer = ExecutionOptimizer;
exports.default = ExecutionOptimizer;
//# sourceMappingURL=executionOptimizer.js.map