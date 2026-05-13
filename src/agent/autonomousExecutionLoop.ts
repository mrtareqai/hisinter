/**
 * Autonomous Execution Loop - Self-correcting task execution
 * 
 * Core cycle: Plan → Execute → Observe → Recover
 * 
 * This system enables fully autonomous task execution with automatic
 * error detection and recovery. Tasks are executed in phases with
 * continuous feedback and self-correction.
 */

/**
 * Execution plan with steps
 */
export interface ExecutionPlan {
  id: string;
  taskDescription: string;
  steps: ExecutionStep[];
  strategy: string;
  estimatedDuration: number;
  confidence: number;
}

/**
 * Individual execution step
 */
export interface ExecutionStep {
  id: string;
  description: string;
  action: string;
  expectedOutput?: string;
  timeout: number;
  retryable: boolean;
  index: number;
}

/**
 * Result from executing a step
 */
export interface StepResult {
  stepId: string;
  success: boolean;
  output?: any;
  error?: Error;
  duration: number;
  attempts: number;
}

/**
 * All results from executing a plan
 */
export interface StepResults {
  planId: string;
  steps: StepResult[];
  totalDuration: number;
  successCount: number;
  failureCount: number;
  overallSuccess: boolean;
}

/**
 * Observation from analyzing execution results
 */
export interface Observation {
  success: boolean;
  issues: ExecutionIssue[];
  insights: string[];
  confidence: number;
}

/**
 * Issue detected during observation
 */
export interface ExecutionIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  stepIndex: number;
  suggestedRecovery: string;
}

/**
 * Complete execution cycle state
 */
export interface ExecutionCycle {
  id: string;
  taskDescription: string;
  phase: 'planning' | 'executing' | 'observing' | 'recovering' | 'complete';
  plan?: ExecutionPlan;
  results?: StepResults;
  observations?: Observation[];
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  status: 'running' | 'completed' | 'failed' | 'recovered';
  startTime: number;
  endTime?: number;
}

export class AutonomousExecutionLoop {
  private cycles = new Map<string, ExecutionCycle>();
  private maxRecoveryAttempts = 3;

  constructor() {
    console.log('[AutonomousExecutionLoop] Initialized');
  }

  /**
   * Run a complete execution cycle: Plan → Execute → Observe → Recover
   */
  async runExecutionCycle(taskDescription: string): Promise<{ success: boolean; output?: any }> {
    const cycleId = `cycle:${Date.now()}`;
    const cycle: ExecutionCycle = {
      id: cycleId,
      taskDescription,
      phase: 'planning',
      recoveryAttempts: 0,
      maxRecoveryAttempts: this.maxRecoveryAttempts,
      status: 'running',
      startTime: Date.now()
    };

    this.cycles.set(cycleId, cycle);

    try {
      console.log(`[ExecutionLoop] Starting cycle ${cycleId} for: ${taskDescription}`);

      // Phase 1: Planning
      cycle.phase = 'planning';
      cycle.plan = await this.planPhase(taskDescription);

      // Phase 2: Execution
      cycle.phase = 'executing';
      cycle.results = await this.executeSteps(cycle.plan);

      // Phase 3: Observation
      cycle.phase = 'observing';
      cycle.observations = [await this.observeResults(cycle.results)];

      // Phase 4: Recovery (if needed)
      if (!cycle.observations[0].success) {
        cycle.phase = 'recovering';
        
        while (cycle.recoveryAttempts < cycle.maxRecoveryAttempts && !cycle.observations[0].success) {
          cycle.recoveryAttempts++;
          const recovery = await this.recoverFromIssues(
            taskDescription,
            cycle.observations[0].issues,
            cycle.recoveryAttempts
          );
          
          if (recovery.canContinue) {
            // Re-execute with adjusted plan
            cycle.plan = recovery.adjustedPlan;
            cycle.results = await this.executeSteps(cycle.plan);
            cycle.observations.push(await this.observeResults(cycle.results));
          }
        }
      }

      // Determine final status
      cycle.status = cycle.observations[0].success ? 'recovered' : 
                     cycle.recoveryAttempts > 0 ? 'recovered' : 
                     'completed';
      
      cycle.phase = 'complete';
      cycle.endTime = Date.now();

      console.log(`[ExecutionLoop] Cycle ${cycleId} completed: ${cycle.status}`);

      return {
        success: cycle.observations[0].success,
        output: cycle.results
      };

    } catch (error) {
      cycle.status = 'failed';
      cycle.endTime = Date.now();
      console.error(`[ExecutionLoop] Cycle ${cycleId} failed:`, error);
      
      return {
        success: false,
        output: error
      };
    }
  }

  /**
   * Phase 1: Planning - analyze task and create execution plan
   */
  private async planPhase(taskDescription: string): Promise<ExecutionPlan> {
    console.log('[ExecutionLoop] Planning phase...');

    // Create basic plan
    const plan: ExecutionPlan = {
      id: `plan:${Date.now()}`,
      taskDescription,
      steps: [
        {
          id: 'step:1',
          description: 'Analyze task requirements',
          action: 'analyze',
          timeout: 5000,
          retryable: true,
          index: 0
        },
        {
          id: 'step:2',
          description: 'Determine affected files',
          action: 'analyze-files',
          timeout: 5000,
          retryable: true,
          index: 1
        },
        {
          id: 'step:3',
          description: 'Execute main task',
          action: 'execute',
          timeout: 30000,
          retryable: true,
          index: 2
        },
        {
          id: 'step:4',
          description: 'Verify results',
          action: 'verify',
          timeout: 5000,
          retryable: true,
          index: 3
        }
      ],
      strategy: 'incremental',
      estimatedDuration: 45000,
      confidence: 0.85
    };

    console.log(`[ExecutionLoop] Plan created with ${plan.steps.length} steps`);
    return plan;
  }

  /**
   * Phase 2: Execute - run all steps in the plan
   */
  private async executeSteps(plan: ExecutionPlan): Promise<StepResults> {
    console.log(`[ExecutionLoop] Executing ${plan.steps.length} steps...`);

    const startTime = performance.now();
    const results: StepResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const step of plan.steps) {
      const stepStart = performance.now();
      const result = await this.executeStep(step);
      const duration = performance.now() - stepStart;

      results.push({
        stepId: step.id,
        success: result.success,
        output: result.output,
        error: result.error,
        duration,
        attempts: result.attempts
      });

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        // Don't stop on first failure - continue to collect all results
      }
    }

    const totalDuration = performance.now() - startTime;
    const overallSuccess = failureCount === 0;

    return {
      planId: plan.id,
      steps: results,
      totalDuration,
      successCount,
      failureCount,
      overallSuccess
    };
  }

  /**
   * Execute a single step with retry logic
   */
  private async executeStep(step: ExecutionStep): Promise<{
    success: boolean;
    output?: any;
    error?: Error;
    attempts: number;
  }> {
    let attempts = 0;
    const maxAttempts = step.retryable ? 3 : 1;
    let lastError: Error | undefined;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[ExecutionLoop] Executing step: ${step.description} (attempt ${attempts})`);

        // Simulate step execution with timeout
        const result = await Promise.race([
          this.simulateStepExecution(step),
          this.createTimeout(step.timeout)
        ]);

        return { success: true, output: result, attempts };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[ExecutionLoop] Step failed: ${step.description}`, lastError);

        if (attempts < maxAttempts) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts - 1) * 100));
        }
      }
    }

    return { success: false, error: lastError, attempts };
  }

  /**
   * Phase 3: Observe - analyze results and identify issues
   */
  private async observeResults(results: StepResults): Promise<Observation> {
    console.log('[ExecutionLoop] Observation phase...');

    const issues: ExecutionIssue[] = [];
    const insights: string[] = [];

    // Analyze failures
    results.steps.forEach((result, index) => {
      if (!result.success) {
        issues.push({
          severity: index === results.steps.length - 1 ? 'critical' : 'high',
          description: `Step ${index + 1} failed: ${result.error?.message || 'Unknown error'}`,
          stepIndex: index,
          suggestedRecovery: 'retry-with-adjusted-parameters'
        });
      }
    });

    // Generate insights
    insights.push(`Completed ${results.successCount}/${results.steps.length} steps successfully`);
    if (results.totalDuration > 30000) {
      insights.push('Execution took longer than expected - may need optimization');
    }
    if (results.failureCount > 0) {
      insights.push(`${results.failureCount} step(s) failed - recovery needed`);
    }

    const success = results.failureCount === 0;
    const confidence = success ? 1.0 : Math.max(0.2, results.successCount / results.steps.length);

    console.log(`[ExecutionLoop] Observation: ${success ? 'Success' : 'Issues detected'}`);

    return { success, issues, insights, confidence };
  }

  /**
   * Phase 4: Recovery - attempt to fix issues and continue
   */
  private async recoverFromIssues(
    taskDescription: string,
    issues: ExecutionIssue[],
    attemptNumber: number
  ): Promise<{ canContinue: boolean; adjustedPlan: ExecutionPlan }> {
    console.log(`[ExecutionLoop] Recovery attempt ${attemptNumber}...`);

    // Analyze issues and create adjusted plan
    const adjustedPlan: ExecutionPlan = {
      id: `plan:recovery:${Date.now()}`,
      taskDescription,
      steps: [
        {
          id: 'step:recovery:1',
          description: 'Analyze failure root cause',
          action: 'analyze-failure',
          timeout: 5000,
          retryable: true,
          index: 0
        },
        {
          id: 'step:recovery:2',
          description: 'Apply recovery strategy',
          action: 'recover',
          timeout: 10000,
          retryable: true,
          index: 1
        },
        {
          id: 'step:recovery:3',
          description: 'Retry execution',
          action: 'execute',
          timeout: 30000,
          retryable: true,
          index: 2
        }
      ],
      strategy: attemptNumber === 1 ? 'retry-with-backoff' : 'alternative-approach',
      estimatedDuration: 45000,
      confidence: 0.6
    };

    console.log(`[ExecutionLoop] Recovery plan created with ${adjustedPlan.steps.length} steps`);

    return {
      canContinue: true,
      adjustedPlan
    };
  }

  /**
   * Get execution cycle
   */
  getCycle(cycleId: string): ExecutionCycle | undefined {
    return this.cycles.get(cycleId);
  }

  /**
   * Get all cycles
   */
  getAllCycles(): ExecutionCycle[] {
    return Array.from(this.cycles.values());
  }

  /**
   * Get recent cycles
   */
  getRecentCycles(count: number = 10): ExecutionCycle[] {
    const all = Array.from(this.cycles.values());
    return all.sort((a, b) => b.startTime - a.startTime).slice(0, count);
  }

  /**
   * Get execution statistics
   */
  getStatistics() {
    const cycles = Array.from(this.cycles.values());
    const completed = cycles.filter(c => c.status === 'completed' || c.status === 'recovered');
    const failed = cycles.filter(c => c.status === 'failed');

    const durations = completed
      .filter(c => c.endTime)
      .map(c => (c.endTime || Date.now()) - c.startTime);

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      totalCycles: cycles.length,
      completed: completed.length,
      failed: failed.length,
      successRate: cycles.length > 0 ? completed.length / cycles.length : 0,
      averageDuration: avgDuration,
      totalRecoveries: cycles.reduce((sum, c) => sum + c.recoveryAttempts, 0)
    };
  }

  /**
   * Private: Simulate step execution
   */
  private async simulateStepExecution(step: ExecutionStep): Promise<any> {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // 90% success rate
    if (Math.random() > 0.1) {
      return { status: 'completed', step: step.id };
    } else {
      throw new Error(`Step execution failed: ${step.description}`);
    }
  }

  /**
   * Private: Create a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    );
  }

  /**
   * Cleanup on dispose
   */
  dispose(): void {
    this.cycles.clear();
    console.log('[AutonomousExecutionLoop] Disposed');
  }
}

// Global instance
export let globalExecutionLoop: AutonomousExecutionLoop;

/**
 * Initialize global execution loop
 */
export function initializeGlobalExecutionLoop(): AutonomousExecutionLoop {
  globalExecutionLoop = new AutonomousExecutionLoop();
  return globalExecutionLoop;
}
