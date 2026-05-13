export interface PerformanceMetrics {
  complexity: number; // 0-1
  expectedDuration: number; // ms
  memoryEstimate: number; // bytes
  cpuUsage: number; // 0-1
  ioOperations: number;
  networkCalls: number;
}

export interface ExecutionPrediction {
  taskId: string;
  metrics: PerformanceMetrics;
  predictedDuration: number; // ms
  predictedSuccess: number; // 0-1
  bottlenecks: string[];
  optimizations: string[];
  confidence: number; // 0-1
}

export class PerformancePredictor {
  private executionData: Array<{
    taskId: string;
    metrics: PerformanceMetrics;
    actualDuration: number;
    success: boolean;
  }> = [];

  private complexityModel: Map<string, { avgDuration: number; count: number }> = new Map();

  public predictExecution(
    taskId: string,
    metrics: PerformanceMetrics
  ): ExecutionPrediction {
    const predictedDuration = this.predictDuration(metrics);
    const predictedSuccess = this.predictSuccessRate(metrics);
    const bottlenecks = this.identifyBottlenecks(metrics);
    const optimizations = this.suggestOptimizations(metrics, bottlenecks);
    const confidence = this.calculateConfidence(metrics);

    return {
      taskId,
      metrics,
      predictedDuration,
      predictedSuccess,
      bottlenecks,
      optimizations,
      confidence,
    };
  }

  private predictDuration(metrics: PerformanceMetrics): number {
    let baseDuration = metrics.expectedDuration;

    // Adjust based on complexity
    baseDuration *= (1 + metrics.complexity * 0.5);

    // I/O penalty
    baseDuration += metrics.ioOperations * 100;

    // Network penalty
    baseDuration += metrics.networkCalls * 500;

    // Look for similar tasks in history
    const similar = this.executionData.filter(
      (d) => Math.abs(d.metrics.complexity - metrics.complexity) < 0.1
    );

    if (similar.length > 0) {
      const avgHistorical = similar.reduce((sum, d) => sum + d.actualDuration, 0) / similar.length;
      // Weight history at 30%, prediction at 70%
      baseDuration = baseDuration * 0.7 + avgHistorical * 0.3;
    }

    return Math.ceil(baseDuration);
  }

  private predictSuccessRate(metrics: PerformanceMetrics): number {
    let successRate = 1;

    // Complexity penalty
    successRate *= (1 - metrics.complexity * 0.2);

    // Memory stress penalty
    const maxMemory = 1024 * 1024 * 1024; // 1GB
    if (metrics.memoryEstimate > maxMemory) {
      successRate *= 0.5;
    }

    // I/O reliability penalty
    if (metrics.ioOperations > 10) {
      successRate *= (1 - (metrics.ioOperations - 10) * 0.05);
    }

    // Network reliability penalty
    if (metrics.networkCalls > 5) {
      successRate *= (1 - (metrics.networkCalls - 5) * 0.08);
    }

    // Look at historical success for similar complexity
    const similar = this.executionData.filter(
      (d) => Math.abs(d.metrics.complexity - metrics.complexity) < 0.15
    );

    if (similar.length > 0) {
      const historicalSuccess = similar.filter((d) => d.success).length / similar.length;
      successRate = successRate * 0.5 + historicalSuccess * 0.5;
    }

    return Math.max(0, Math.min(1, successRate));
  }

  private identifyBottlenecks(metrics: PerformanceMetrics): string[] {
    const bottlenecks: string[] = [];

    if (metrics.complexity > 0.8) {
      bottlenecks.push('High task complexity - consider decomposition');
    }

    if (metrics.ioOperations > 10) {
      bottlenecks.push(`High I/O operations (${metrics.ioOperations}) - consider batching`);
    }

    if (metrics.networkCalls > 5) {
      bottlenecks.push(`Multiple network calls (${metrics.networkCalls}) - consider parallel execution`);
    }

    if (metrics.cpuUsage > 0.8) {
      bottlenecks.push('High CPU usage - consider optimization');
    }

    const memoryPercent = (metrics.memoryEstimate / (1024 * 1024 * 1024)) * 100;
    if (memoryPercent > 70) {
      bottlenecks.push(`High memory usage (${memoryPercent.toFixed(0)}%) - optimize data structures`);
    }

    return bottlenecks;
  }

  private suggestOptimizations(
    metrics: PerformanceMetrics,
    bottlenecks: string[]
  ): string[] {
    const suggestions: string[] = [];

    if (metrics.ioOperations > 5) {
      suggestions.push('Implement I/O caching strategy');
      suggestions.push('Batch I/O operations together');
    }

    if (metrics.networkCalls > 3) {
      suggestions.push('Use connection pooling');
      suggestions.push('Implement request caching with HTTP headers');
      suggestions.push('Consider GraphQL for fewer requests');
    }

    if (metrics.complexity > 0.7) {
      suggestions.push('Break task into smaller sub-tasks');
      suggestions.push('Use memoization for repeated calculations');
    }

    if (metrics.cpuUsage > 0.7) {
      suggestions.push('Profile code to find CPU hotspots');
      suggestions.push('Consider async operations for I/O');
      suggestions.push('Use Web Workers for heavy computation');
    }

    return suggestions;
  }

  private calculateConfidence(metrics: PerformanceMetrics): number {
    let confidence = 0.5;

    // More data points = higher confidence
    const similarCount = this.executionData.filter(
      (d) => Math.abs(d.metrics.complexity - metrics.complexity) < 0.1
    ).length;

    confidence += Math.min(0.3, similarCount * 0.1);

    // Simpler tasks = higher confidence
    if (metrics.complexity < 0.5) {
      confidence += 0.1;
    }

    // Fewer external dependencies = higher confidence
    if (metrics.networkCalls === 0 && metrics.ioOperations < 5) {
      confidence += 0.1;
    }

    return Math.min(0.99, confidence);
  }

  public recordExecution(
    taskId: string,
    metrics: PerformanceMetrics,
    actualDuration: number,
    success: boolean
  ): void {
    this.executionData.push({
      taskId,
      metrics,
      actualDuration,
      success,
    });

    // Update complexity model
    const key = `${Math.round(metrics.complexity * 10) / 10}`;
    const current = this.complexityModel.get(key) || { avgDuration: 0, count: 0 };
    current.avgDuration = (current.avgDuration * current.count + actualDuration) / (current.count + 1);
    current.count++;
    this.complexityModel.set(key, current);

    // Keep reasonable history size
    if (this.executionData.length > 1000) {
      this.executionData = this.executionData.slice(-1000);
    }
  }

  public getExecutionHistory(limit: number = 10): typeof this.executionData {
    return this.executionData.slice(-limit);
  }

  public getAccuracyMetrics(): {
    meanErrorPercent: number;
    predictions: number;
    trend: 'improving' | 'stable' | 'degrading';
  } {
    if (this.executionData.length < 2) {
      return { meanErrorPercent: 0, predictions: 0, trend: 'stable' };
    }

    const recent = this.executionData.slice(-10);
    const older = this.executionData.slice(-20, -10);

    let totalError = 0;
    recent.forEach((execution) => {
      const prediction = this.predictDuration(execution.metrics);
      const error = Math.abs(prediction - execution.actualDuration);
      totalError += error / execution.actualDuration;
    });

    const meanErrorPercent = (totalError / recent.length) * 100;

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';

    if (older.length > 0) {
      let oldError = 0;
      older.forEach((execution) => {
        const prediction = this.predictDuration(execution.metrics);
        const error = Math.abs(prediction - execution.actualDuration);
        oldError += error / execution.actualDuration;
      });
      const oldMeanError = (oldError / older.length) * 100;

      if (meanErrorPercent < oldMeanError - 5) trend = 'improving';
      if (meanErrorPercent > oldMeanError + 5) trend = 'degrading';
    }

    return {
      meanErrorPercent,
      predictions: recent.length,
      trend,
    };
  }
}

export default PerformancePredictor;
