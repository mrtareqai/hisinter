export interface Tool {
  id: string;
  name: string;
  capabilities: string[];
  successRate: number;
  averageExecutionTime: number;
  costFactor: number; // Relative cost (1 = baseline)
}

export interface ToolScore {
  toolId: string;
  score: number; // 0-1
  reasons: string[];
  recommendation: 'primary' | 'secondary' | 'fallback' | 'not-recommended';
}

export interface ToolChain {
  tools: string[];
  executionOrder: string[];
  fallbackChain: string[];
  estimatedCost: number;
  estimatedSuccessRate: number;
}

export class ToolIntelligence {
  private tools: Map<string, Tool> = new Map();
  private executionHistory: Array<{
    toolId: string;
    success: boolean;
    duration: number;
    timestamp: number;
  }> = [];
  private toolCombinationCache: Map<string, ToolChain> = new Map();

  constructor() {
    this.initializeDefaultTools();
  }

  private initializeDefaultTools(): void {
    const defaultTools: Tool[] = [
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

  public selectOptimalTool(
    task: string,
    requiredCapabilities: string[]
  ): ToolScore[] {
    const scores: ToolScore[] = [];

    this.tools.forEach((tool) => {
      const score = this.computeToolScore(tool, requiredCapabilities);
      scores.push(score);
    });

    return scores.sort((a, b) => b.score - a.score);
  }

  private computeToolScore(tool: Tool, requiredCapabilities: string[]): ToolScore {
    let score = 0;

    // Capability matching
    const matchedCapabilities = requiredCapabilities.filter((cap) =>
      tool.capabilities.includes(cap)
    );
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

  private getRecommendation(
    score: number
  ): 'primary' | 'secondary' | 'fallback' | 'not-recommended' {
    if (score >= 0.8) return 'primary';
    if (score >= 0.6) return 'secondary';
    if (score >= 0.4) return 'fallback';
    return 'not-recommended';
  }

  private getScoreReasons(
    tool: Tool,
    requiredCapabilities: string[],
    matchedCapabilities: string[]
  ): string[] {
    const reasons: string[] = [];

    if (matchedCapabilities.length === requiredCapabilities.length) {
      reasons.push('Matches all required capabilities');
    } else if (matchedCapabilities.length > 0) {
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

  public buildToolChain(
    tasks: Array<{ task: string; capabilities: string[] }>
  ): ToolChain {
    const tools: string[] = [];
    const executionOrder: string[] = [];
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

  private buildFallbackChain(primaryTools: string[]): string[] {
    const allTools = Array.from(this.tools.keys());
    return allTools.filter((id) => !primaryTools.includes(id)).slice(0, primaryTools.length);
  }

  public recordExecution(
    toolId: string,
    success: boolean,
    duration: number
  ): void {
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

  private getRecentSuccessRate(toolId: string): number {
    const recent = this.executionHistory
      .filter((h) => h.toolId === toolId)
      .slice(-10);

    if (recent.length === 0) return 0.5;

    const successes = recent.filter((h) => h.success).length;
    return successes / recent.length;
  }

  public addTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
    this.toolCombinationCache.clear();
  }

  public getTool(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  public getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  public getExecutionMetrics(): {
    totalExecutions: number;
    successRate: number;
    averageTime: number;
    mostUsedTool: string;
  } {
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

    const toolUsage = new Map<string, number>();
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

export default ToolIntelligence;
