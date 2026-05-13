import UnifiedIDEBrain, { ExecutionRequest, ExecutionDecision } from './unifiedIDEBrain';
import UnifiedExecutionPipeline from './unifiedExecutionPipeline';
import IntelligentQuestioningSystem from './intelligentQuestioningSystem';

export interface ConsoleMessage {
  id: string;
  timestamp: number;
  type: 'user' | 'agent' | 'question' | 'status' | 'error' | 'success';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ConsoleState {
  isProcessing: boolean;
  currentTask: string | null;
  history: ConsoleMessage[];
  autonomyLevel: number;
  systemHealth: number;
}

/**
 * UnifiedConsoleInterface - Single interface for all agent interactions
 * Replaces multi-panel chat/analytics/execution with unified experience
 */
export class UnifiedConsoleInterface {
  private brain: UnifiedIDEBrain;
  private pipeline: UnifiedExecutionPipeline;
  private questioningSystem: IntelligentQuestioningSystem;

  private state: ConsoleState = {
    isProcessing: false,
    currentTask: null,
    history: [],
    autonomyLevel: 0.85,
    systemHealth: 1.0,
  };

  private messageCallbacks: Array<(msg: ConsoleMessage) => void> = [];
  private stateCallbacks: Array<(state: ConsoleState) => void> = [];

  constructor(
    brain: UnifiedIDEBrain,
    pipeline: UnifiedExecutionPipeline,
    questioningSystem: IntelligentQuestioningSystem
  ) {
    this.brain = brain;
    this.pipeline = pipeline;
    this.questioningSystem = questioningSystem;

    console.log('[v0] UnifiedConsoleInterface initialized');
  }

  /**
   * Process user input through unified console
   */
  async processUserInput(input: string): Promise<void> {
    const messageId = `msg-${Date.now()}`;

    // Add user message
    this.addMessage({
      id: messageId,
      timestamp: Date.now(),
      type: 'user',
      content: input,
    });

    this.setState({ isProcessing: true, currentTask: 'Processing...' });

    try {
      // Create execution request
      const request: ExecutionRequest = {
        id: `req-${Date.now()}`,
        type: this.parseRequestType(input),
        content: input,
        priority: this.parsePriority(input),
      };

      // Execute through pipeline
      const pipelineResult = await this.pipeline.execute(request);

      // Process result
      if (pipelineResult.questionsForUser && pipelineResult.questionsForUser.length > 0) {
        // Agent is asking for clarification
        for (const question of pipelineResult.questionsForUser) {
          this.addMessage({
            id: `q-${Date.now()}`,
            timestamp: Date.now(),
            type: 'question',
            content: question,
          });
        }
      } else if (pipelineResult.decision) {
        // Agent made a decision
        this.addMessage({
          id: `d-${Date.now()}`,
          timestamp: Date.now(),
          type: 'status',
          content: `Decision: ${pipelineResult.decision.action} (confidence: ${(pipelineResult.decision.confidence * 100).toFixed(0)}%)`,
          metadata: pipelineResult.decision,
        });

        // Show result if execution happened
        if (pipelineResult.result) {
          this.addMessage({
            id: `r-${Date.now()}`,
            timestamp: Date.now(),
            type: 'success',
            content: `Completed in ${pipelineResult.duration}ms`,
            metadata: pipelineResult.result,
          });
        }
      }

      // Update brain state
      const brainState = this.brain.getState();
      this.setState({
        isProcessing: false,
        currentTask: null,
        autonomyLevel: brainState.autonomyLevel,
        systemHealth: brainState.systemHealth,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addMessage({
        id: `err-${Date.now()}`,
        timestamp: Date.now(),
        type: 'error',
        content: `Error: ${errorMsg}`,
      });

      this.setState({ isProcessing: false, currentTask: null });
    }
  }

  /**
   * Answer a question from the agent
   */
  async answerQuestion(questionContent: string, answer: string): Promise<void> {
    this.addMessage({
      id: `ans-${Date.now()}`,
      timestamp: Date.now(),
      type: 'user',
      content: `${questionContent} -> "${answer}"`,
    });

    this.setState({ isProcessing: true });

    try {
      // Find the original request and answer
      const lastQuestionMsg = this.state.history
        .slice()
        .reverse()
        .find((m) => m.type === 'question');

      if (lastQuestionMsg) {
        const brainResult = await this.brain.answerQuestion(
          lastQuestionMsg.id,
          answer
        );

        if (brainResult.result) {
          this.addMessage({
            id: `result-${Date.now()}`,
            timestamp: Date.now(),
            type: 'success',
            content: 'Task completed after your input',
            metadata: brainResult.result,
          });
        }
      }

      this.setState({ isProcessing: false });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addMessage({
        id: `err-${Date.now()}`,
        timestamp: Date.now(),
        type: 'error',
        content: `Error: ${errorMsg}`,
      });
      this.setState({ isProcessing: false });
    }
  }

  /**
   * Parse request type from user input
   */
  private parseRequestType(input: string): 'goal' | 'task' | 'question' | 'command' {
    const lower = input.toLowerCase();
    if (lower.includes('generate') || lower.includes('create project')) {
      return 'command';
    }
    if (lower.includes('?')) {
      return 'question';
    }
    if (lower.includes('fix') || lower.includes('debug')) {
      return 'task';
    }
    return 'goal';
  }

  /**
   * Parse priority from user input
   */
  private parsePriority(input: string): 'low' | 'medium' | 'high' | 'critical' {
    const lower = input.toLowerCase();
    if (lower.includes('urgent') || lower.includes('critical')) {
      return 'critical';
    }
    if (lower.includes('important')) {
      return 'high';
    }
    if (lower.includes('when') || lower.includes('later')) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Add message to console history
   */
  private addMessage(message: ConsoleMessage): void {
    this.state.history.push(message);

    // Keep only last 100 messages
    if (this.state.history.length > 100) {
      this.state.history = this.state.history.slice(-100);
    }

    // Notify subscribers
    this.messageCallbacks.forEach((cb) => cb(message));
  }

  /**
   * Update console state
   */
  private setState(partial: Partial<ConsoleState>): void {
    this.state = { ...this.state, ...partial };
    this.stateCallbacks.forEach((cb) => cb(this.state));
  }

  /**
   * Subscribe to new messages
   */
  onMessage(callback: (msg: ConsoleMessage) => void): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: ConsoleState) => void): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Get console history
   */
  getHistory(): ConsoleMessage[] {
    return [...this.state.history];
  }

  /**
   * Get current state
   */
  getState(): ConsoleState {
    return { ...this.state };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.state.history = [];
    this.stateCallbacks.forEach((cb) => cb(this.state));
  }

  /**
   * Set autonomy level
   */
  setAutonomyLevel(level: number): void {
    this.brain.setAutonomyLevel(level);
    this.setState({ autonomyLevel: level });

    this.addMessage({
      id: `autonomy-${Date.now()}`,
      timestamp: Date.now(),
      type: 'status',
      content: `Autonomy level changed to ${(level * 100).toFixed(0)}%`,
    });
  }

  /**
   * Get analytics
   */
  getAnalytics() {
    return this.brain.getAnalytics();
  }

  /**
   * Format console output as string
   */
  toString(): string {
    let output = '';
    for (const msg of this.state.history) {
      const timeStr = new Date(msg.timestamp).toLocaleTimeString();
      const typeStr = msg.type.toUpperCase().padEnd(8);
      output += `[${timeStr}] ${typeStr} ${msg.content}\n`;
    }
    return output;
  }
}

export default UnifiedConsoleInterface;
