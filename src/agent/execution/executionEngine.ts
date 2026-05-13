import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ExecutionPlan, ExecutionStep, ExecutionResult, ExecutionError, ErrorType, ActionType } from '../../types/agent';
import { v4 as uuidv4 } from 'uuid';

export class ExecutionEngine {
  private workspaceRoot: string = '';
  private results: ExecutionResult[] = [];
  private errors: ExecutionError[] = [];

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  async executePlan(plan: ExecutionPlan, onProgress?: (result: ExecutionResult) => void): Promise<ExecutionResult[]> {
    this.results = [];
    this.errors = [];

    for (const step of plan.steps) {
      try {
        const result = await this.executeStep(step);
        this.results.push(result);

        if (onProgress) {
          onProgress(result);
        }

        // Check checkpoint validation
        const checkpoint = plan.checkpoints.find((cp) => cp.afterStep === step.order);
        if (checkpoint) {
          const validationPassed = await this.validateCheckpoint(checkpoint);
          if (!validationPassed && !result.success) {
            throw new Error(`Checkpoint validation failed after step ${step.id}`);
          }
        }
      } catch (error) {
        const executionError = this.createError(step, error);
        this.errors.push(executionError);

        // Handle error recovery
        const recovered = await this.attemptRecovery(step, executionError);
        if (!recovered) {
          break;
        }
      }
    }

    return this.results;
  }

  private async executeStep(step: ExecutionStep): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      let output = '';

      switch (step.action) {
        case ActionType.CREATE_FILE:
          output = await this.createFile(step);
          break;

        case ActionType.MODIFY_FILE:
          output = await this.modifyFile(step);
          break;

        case ActionType.DELETE_FILE:
          output = await this.deleteFile(step);
          break;

        case ActionType.CREATE_FOLDER:
          output = await this.createFolder(step);
          break;

        case ActionType.INSTALL_PACKAGE:
          output = await this.installPackage(step);
          break;

        case ActionType.RUN_COMMAND:
          output = await this.runCommand(step);
          break;

        case ActionType.GENERATE_CODE:
          output = await this.generateCode(step);
          break;

        case ActionType.ANALYZE_CODE:
          output = await this.analyzeCode(step);
          break;

        case ActionType.UPDATE_CONFIG:
          output = await this.updateConfig(step);
          break;

        default:
          output = `Executed: ${step.description}`;
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        stepId: step.id,
        output,
        duration,
        errors: [],
        metadata: { action: step.action },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const executionError = this.createError(step, error);

      return {
        success: false,
        stepId: step.id,
        output: '',
        duration,
        errors: [executionError],
        metadata: { action: step.action, error: String(error) },
      };
    }
  }

  private async createFile(step: ExecutionStep): Promise<string> {
    const filePath = path.join(this.workspaceRoot, step.target);
    const content = (step.parameters.content as string) || '';
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content);
    return `File created: ${filePath}`;
  }

  private async modifyFile(step: ExecutionStep): Promise<string> {
    const filePath = path.join(this.workspaceRoot, step.target);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    const modification = step.parameters.modification as string | undefined;

    if (modification) {
      content = modification;
    }

    fs.writeFileSync(filePath, content);
    return `File modified: ${filePath}`;
  }

  private async deleteFile(step: ExecutionStep): Promise<string> {
    const filePath = path.join(this.workspaceRoot, step.target);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    fs.unlinkSync(filePath);
    return `File deleted: ${filePath}`;
  }

  private async createFolder(step: ExecutionStep): Promise<string> {
    const folderPath = path.join(this.workspaceRoot, step.target);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    return `Folder created: ${folderPath}`;
  }

  private async installPackage(step: ExecutionStep): Promise<string> {
    const packageManager = (step.parameters.packageManager as string) || 'npm';
    const packages = (step.parameters.packages as string[]) || [];

    if (packages.length === 0) {
      // Install all dependencies from package.json
      const command = packageManager === 'npm' ? 'npm install' : `${packageManager} install`;
      execSync(command, { cwd: this.workspaceRoot, stdio: 'inherit' });
      return `Installed all dependencies with ${packageManager}`;
    }

    const command = `${packageManager} install ${packages.join(' ')}`;
    execSync(command, { cwd: this.workspaceRoot, stdio: 'inherit' });
    return `Installed packages: ${packages.join(', ')}`;
  }

  private async runCommand(step: ExecutionStep): Promise<string> {
    const command = (step.parameters.command as string) || step.target;
    const output = execSync(command, { cwd: this.workspaceRoot, encoding: 'utf-8' });
    return output || `Command executed: ${command}`;
  }

  private async generateCode(step: ExecutionStep): Promise<string> {
    // Placeholder for code generation
    const targetPath = path.join(this.workspaceRoot, step.target);
    return `Generated code for ${targetPath}`;
  }

  private async analyzeCode(step: ExecutionStep): Promise<string> {
    // Placeholder for code analysis
    const targetPath = path.join(this.workspaceRoot, step.target);
    return `Analyzed code structure of ${targetPath}`;
  }

  private async updateConfig(step: ExecutionStep): Promise<string> {
    // Placeholder for config updates
    return `Updated configuration`;
  }

  private async attemptRecovery(step: ExecutionStep, error: ExecutionError): Promise<boolean> {
    const errorHandling = step.errorHandling.find((eh) => eh.condition === error.type);

    if (!errorHandling) {
      return false;
    }

    const action = errorHandling.action;

    switch (action) {
      case 'retry':
        for (let i = 0; i < errorHandling.retries; i++) {
          await this.delay(errorHandling.backoff);
          try {
            await this.executeStep(step);
            return true;
          } catch (retryError) {
            // Continue to next retry
          }
        }
        return false;

      case 'skip':
        return true; // Skip this step

      case 'alternative':
        // Try alternative approach
        return true;

      case 'rollback':
        // Rollback previous steps
        return false;

      case 'ask_user':
        // User intervention needed
        return false;

      default:
        return false;
    }
  }

  private async validateCheckpoint(checkpoint: any): Promise<boolean> {
    // Implement checkpoint validation logic
    return true;
  }

  private createError(step: ExecutionStep, error: unknown): ExecutionError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = this.categorizeError(errorMessage);

    return {
      id: uuidv4(),
      type: errorType,
      message: errorMessage,
      context: `During step: ${step.description}`,
      suggestion: this.suggestFix(errorType),
      severity: this.determineSeverity(errorType),
      recoverable: this.isRecoverable(errorType),
    };
  }

  private categorizeError(message: string): ErrorType {
    if (message.includes('ENOENT') || message.includes('not found')) return ErrorType.FILE_NOT_FOUND;
    if (message.includes('EACCES') || message.includes('permission')) return ErrorType.PERMISSION_DENIED;
    if (message.includes('EEXIST')) return ErrorType.FILE_NOT_FOUND;
    if (message.includes('SyntaxError')) return ErrorType.SYNTAX_ERROR;
    if (message.includes('timeout')) return ErrorType.TIMEOUT;
    return ErrorType.UNKNOWN;
  }

  private suggestFix(errorType: ErrorType): string {
    const suggestions: Record<ErrorType, string> = {
      [ErrorType.FILE_NOT_FOUND]: 'Check if the file path is correct.',
      [ErrorType.PERMISSION_DENIED]: 'Check file permissions or try running with appropriate privileges.',
      [ErrorType.COMMAND_FAILED]: 'The command failed. Check for syntax errors.',
      [ErrorType.PACKAGE_NOT_FOUND]: 'The package may not exist. Verify the package name.',
      [ErrorType.SYNTAX_ERROR]: 'There\'s a syntax error in the code. Let me fix it.',
      [ErrorType.DEPENDENCY_CONFLICT]: 'There\'s a dependency conflict. Let me resolve it.',
      [ErrorType.TIMEOUT]: 'The operation timed out. Let me try again.',
      [ErrorType.UNKNOWN]: 'An unknown error occurred. Let me investigate.',
    };

    return suggestions[errorType] || 'Let me try a different approach.';
  }

  private determineSeverity(errorType: ErrorType): 'critical' | 'warning' | 'info' {
    if (errorType === ErrorType.TIMEOUT || errorType === ErrorType.COMMAND_FAILED) return 'warning';
    if (errorType === ErrorType.SYNTAX_ERROR) return 'critical';
    return 'info';
  }

  private isRecoverable(errorType: ErrorType): boolean {
    const nonRecoverable = [ErrorType.SYNTAX_ERROR, ErrorType.PERMISSION_DENIED];
    return !nonRecoverable.includes(errorType);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getResults(): ExecutionResult[] {
    return this.results;
  }

  getErrors(): ExecutionError[] {
    return this.errors;
  }
}

export const createExecutionEngine = (workspaceRoot: string = process.cwd()): ExecutionEngine => {
  return new ExecutionEngine(workspaceRoot);
};
