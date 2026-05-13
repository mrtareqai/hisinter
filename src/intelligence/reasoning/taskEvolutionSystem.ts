export interface TaskMetrics {
  complexity: number; // 0-1
  difficulty: number; // 0-1
  estimatedDuration: number; // ms
  actualDuration: number; // ms
  successRate: number; // 0-1
  retries: number;
}

export interface TaskEvolution {
  taskId: string;
  initialComplexity: number;
  currentComplexity: number;
  strategy: 'direct' | 'iterative' | 'decomposed' | 'experimental';
  performanceHistory: TaskMetrics[];
  adaptations: Array<{
    timestamp: number;
    reason: string;
    newStrategy: string;
  }>;
  learnings: string[];
}

export class TaskEvolutionSystem {
  private taskEvolutions: Map<string, TaskEvolution> = new Map();
  private strategyScores: Map<string, number> = new Map();

  public initializeTask(taskId: string, initialComplexity: number): TaskEvolution {
    const strategy = this.selectInitialStrategy(initialComplexity);
    const evolution: TaskEvolution = {
      taskId,
      initialComplexity,
      currentComplexity: initialComplexity,
      strategy,
      performanceHistory: [],
      adaptations: [],
      learnings: [],
    };

    this.taskEvolutions.set(taskId, evolution);
    return evolution;
  }

  private selectInitialStrategy(
    complexity: number
  ): 'direct' | 'iterative' | 'decomposed' | 'experimental' {
    if (complexity < 0.3) return 'direct';
    if (complexity < 0.6) return 'iterative';
    if (complexity < 0.8) return 'decomposed';
    return 'experimental';
  }

  public recordTaskMetrics(taskId: string, metrics: TaskMetrics): void {
    const evolution = this.taskEvolutions.get(taskId);
    if (!evolution) return;

    evolution.performanceHistory.push(metrics);
    this.updateDifficulty(taskId, metrics);
  }

  private updateDifficulty(taskId: string, metrics: TaskMetrics): void {
    const evolution = this.taskEvolutions.get(taskId);
    if (!evolution) return;

    // Adjust complexity based on performance
    if (metrics.successRate < 0.5) {
      evolution.currentComplexity = Math.min(1, evolution.currentComplexity + 0.1);
    } else if (metrics.successRate > 0.9 && metrics.retries === 0) {
      evolution.currentComplexity = Math.max(0, evolution.currentComplexity - 0.05);
    }

    // Adapt strategy if needed
    this.checkAndAdaptStrategy(taskId);
  }

  private checkAndAdaptStrategy(taskId: string): void {
    const evolution = this.taskEvolutions.get(taskId);
    if (!evolution || evolution.performanceHistory.length < 3) return;

    const recentMetrics = evolution.performanceHistory.slice(-3);
    const avgSuccessRate = recentMetrics.reduce((sum, m) => sum + m.successRate, 0) / recentMetrics.length;

    if (avgSuccessRate < 0.6 && evolution.strategy !== 'decomposed') {
      const oldStrategy = evolution.strategy;
      evolution.strategy = 'decomposed';
      evolution.adaptations.push({
        timestamp: Date.now(),
        reason: `Low success rate (${(avgSuccessRate * 100).toFixed(1)}%) - switching strategy`,
        newStrategy: 'decomposed',
      });
      this.recordLearning(taskId, `Strategy adapted from ${oldStrategy} to decomposed due to performance`);
    }

    if (avgSuccessRate > 0.9 && evolution.strategy === 'experimental') {
      const oldStrategy = evolution.strategy;
      evolution.strategy = 'direct';
      evolution.adaptations.push({
        timestamp: Date.now(),
        reason: `High success rate (${(avgSuccessRate * 100).toFixed(1)}%) - optimizing strategy`,
        newStrategy: 'direct',
      });
      this.recordLearning(taskId, `Strategy optimized from ${oldStrategy} to direct due to consistent success`);
    }
  }

  private recordLearning(taskId: string, learning: string): void {
    const evolution = this.taskEvolutions.get(taskId);
    if (evolution) {
      evolution.learnings.push(learning);
    }
  }

  public getTaskEvolution(taskId: string): TaskEvolution | undefined {
    return this.taskEvolutions.get(taskId);
  }

  public getPerformanceTrend(taskId: string): 'improving' | 'stable' | 'degrading' {
    const evolution = this.taskEvolutions.get(taskId);
    if (!evolution || evolution.performanceHistory.length < 2) return 'stable';

    const recent = evolution.performanceHistory.slice(-3);
    const older = evolution.performanceHistory.slice(-6, -3);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, m) => sum + m.successRate, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, m) => sum + m.successRate, 0) / older.length : recentAvg;

    if (recentAvg > olderAvg + 0.1) return 'improving';
    if (recentAvg < olderAvg - 0.1) return 'degrading';
    return 'stable';
  }

  public suggestOptimization(taskId: string): string | null {
    const evolution = this.taskEvolutions.get(taskId);
    if (!evolution) return null;

    const trend = this.getPerformanceTrend(taskId);
    const recentMetrics = evolution.performanceHistory.slice(-1)[0];

    if (!recentMetrics) return null;

    if (trend === 'degrading') {
      return `Task is degrading - consider returning to previous strategy: ${evolution.adaptations[0]?.newStrategy || 'direct'}`;
    }

    if (recentMetrics.retries > 3) {
      return `High retry count - consider breaking task into smaller sub-tasks`;
    }

    if (recentMetrics.successRate < 0.7) {
      return `Success rate below 70% - increase error handling and validation`;
    }

    return `Task performing well - consider applying learnings to similar tasks`;
  }

  public getAllEvolutions(): TaskEvolution[] {
    return Array.from(this.taskEvolutions.values());
  }

  public getStrategyScores(): Record<string, number> {
    const scores: Record<string, number> = {};
    
    this.taskEvolutions.forEach((evolution) => {
      const avgSuccessRate = evolution.performanceHistory.length > 0
        ? evolution.performanceHistory.reduce((sum, m) => sum + m.successRate, 0) / evolution.performanceHistory.length
        : 0;
      
      if (!scores[evolution.strategy]) scores[evolution.strategy] = 0;
      scores[evolution.strategy] += avgSuccessRate;
    });

    return scores;
  }
}

export default TaskEvolutionSystem;
