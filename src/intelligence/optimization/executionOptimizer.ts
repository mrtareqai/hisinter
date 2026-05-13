export interface ExecutionPath {
  id: string;
  steps: string[];
  expectedDuration: number;
  costFactor: number; // 1 = baseline
  successProbability: number;
  complexity: number;
}

export interface OptimizationResult {
  originalPath: ExecutionPath;
  optimizedPath: ExecutionPath;
  improvement: {
    timeSaved: number; // ms
    costSaved: number;
    successIncrease: number;
    complexityReduction: number;
  };
  optimizationStrategy: string;
  recommendation: string;
}

export class ExecutionOptimizer {
  private pathHistory: Array<{
    path: ExecutionPath;
    actualDuration: number;
    actualCost: number;
    success: boolean;
  }> = [];

  private optimizationPatterns: Map<string, { avgImprovement: number; frequency: number }> = new Map();

  public optimizeExecutionPath(originalPath: ExecutionPath): OptimizationResult {
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

  private generateOptimizedPath(original: ExecutionPath): ExecutionPath {
    let optimized = JSON.parse(JSON.stringify(original)) as ExecutionPath;

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

  private parallelizeSteps(path: ExecutionPath): ExecutionPath {
    // Group independent steps that can run in parallel
    const parallelizable = this.identifyParallelizableSteps(path.steps);
    
    if (parallelizable.length > 1) {
      path.steps = this.mergeParallelSteps(path.steps, parallelizable);
      path.expectedDuration *= 0.7; // 30% time savings from parallelization
    }

    return path;
  }

  private identifyParallelizableSteps(steps: string[]): string[][] {
    // Simple heuristic: steps with same prefix can run in parallel
    const groups: Map<string, string[]> = new Map();

    steps.forEach((step) => {
      const prefix = step.split('-')[0];
      if (!groups.has(prefix)) {
        groups.set(prefix, []);
      }
      groups.get(prefix)!.push(step);
    });

    return Array.from(groups.values()).filter((group) => group.length > 1);
  }

  private mergeParallelSteps(steps: string[], parallelizable: string[][]): string[] {
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

  private removeRedundancy(path: ExecutionPath): ExecutionPath {
    const unique = [...new Set(path.steps)];
    
    if (unique.length < path.steps.length) {
      const removed = path.steps.length - unique.length;
      path.steps = unique;
      path.costFactor *= (1 - removed * 0.1); // 10% savings per removed step
    }

    return path;
  }

  private reorderForEfficiency(path: ExecutionPath): ExecutionPath {
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

  private batchOperations(path: ExecutionPath): ExecutionPath {
    // Group similar operations to reduce overhead
    const batched: string[] = [];
    const seen = new Set<string>();

    path.steps.forEach((step) => {
      const baseOp = step.split('[')[0]; // Get operation type
      
      if (!seen.has(baseOp)) {
        batched.push(step);
        seen.add(baseOp);
      } else {
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

  private calculateOptimizedDuration(path: ExecutionPath): number {
    const baseTime = 1000; // 1s per step on average
    const stepTime = path.steps.length * baseTime;
    
    // Account for parallelization in step names
    const parallelCount = path.steps.filter((s) => s.startsWith('parallel')).length;
    const parallelReduction = parallelCount * 0.3; // 30% reduction per parallel operation
    
    return Math.ceil(stepTime * (1 - parallelReduction));
  }

  private calculateOptimizedCost(path: ExecutionPath): number {
    return path.costFactor * 0.8; // 20% baseline cost reduction from optimization
  }

  private calculateOptimizedSuccess(path: ExecutionPath): number {
    // Better planned paths have higher success rates
    const baseSuccess = 0.85;
    const stepReduction = (10 - path.steps.length) * 0.02; // 2% per step removed
    return Math.min(0.99, baseSuccess + stepReduction);
  }

  private calculateComplexity(path: ExecutionPath): number {
    let complexity = path.steps.length * 0.1; // Base complexity
    
    // Parallelization increases complexity slightly
    const parallelCount = path.steps.filter((s) => s.startsWith('parallel')).length;
    complexity += parallelCount * 0.05;
    
    return Math.min(1, complexity);
  }

  private calculateImprovement(
    original: ExecutionPath,
    optimized: ExecutionPath
  ): OptimizationResult['improvement'] {
    return {
      timeSaved: original.expectedDuration - optimized.expectedDuration,
      costSaved: original.costFactor - optimized.costFactor,
      successIncrease: optimized.successProbability - original.successProbability,
      complexityReduction: original.complexity - optimized.complexity,
    };
  }

  private selectOptimizationStrategy(path: ExecutionPath): string {
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

  private generateRecommendation(improvement: OptimizationResult['improvement'], strategy: string): string {
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

  public recordPathExecution(
    path: ExecutionPath,
    actualDuration: number,
    actualCost: number,
    success: boolean
  ): void {
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

  public getOptimizationPatterns(): Record<string, { avgImprovement: number; frequency: number }> {
    const result: Record<string, { avgImprovement: number; frequency: number }> = {};
    this.optimizationPatterns.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  public getExecutionPathStatistics(): {
    averagePathLength: number;
    successRate: number;
    averageImprovement: number;
  } {
    if (this.pathHistory.length === 0) {
      return { averagePathLength: 0, successRate: 0, averageImprovement: 0 };
    }

    const avgLength = this.pathHistory.reduce((sum, h) => sum + h.path.steps.length, 0) / this.pathHistory.length;
    const successCount = this.pathHistory.filter((h) => h.success).length;
    const successRate = successCount / this.pathHistory.length;

    const avgImprovement = this.pathHistory.reduce(
      (sum, h) => sum + (h.path.expectedDuration - h.actualDuration),
      0
    ) / this.pathHistory.length;

    return {
      averagePathLength: avgLength,
      successRate,
      averageImprovement,
    };
  }
}

export default ExecutionOptimizer;
