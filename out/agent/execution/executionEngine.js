"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExecutionEngine = exports.ExecutionEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const agent_1 = require("../../types/agent");
const uuid_1 = require("uuid");
class ExecutionEngine {
    workspaceRoot = '';
    results = [];
    errors = [];
    constructor(workspaceRoot = process.cwd()) {
        this.workspaceRoot = workspaceRoot;
    }
    async executePlan(plan, onProgress) {
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
            }
            catch (error) {
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
    async executeStep(step) {
        const startTime = Date.now();
        try {
            let output = '';
            switch (step.action) {
                case agent_1.ActionType.CREATE_FILE:
                    output = await this.createFile(step);
                    break;
                case agent_1.ActionType.MODIFY_FILE:
                    output = await this.modifyFile(step);
                    break;
                case agent_1.ActionType.DELETE_FILE:
                    output = await this.deleteFile(step);
                    break;
                case agent_1.ActionType.CREATE_FOLDER:
                    output = await this.createFolder(step);
                    break;
                case agent_1.ActionType.INSTALL_PACKAGE:
                    output = await this.installPackage(step);
                    break;
                case agent_1.ActionType.RUN_COMMAND:
                    output = await this.runCommand(step);
                    break;
                case agent_1.ActionType.GENERATE_CODE:
                    output = await this.generateCode(step);
                    break;
                case agent_1.ActionType.ANALYZE_CODE:
                    output = await this.analyzeCode(step);
                    break;
                case agent_1.ActionType.UPDATE_CONFIG:
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
        }
        catch (error) {
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
    async createFile(step) {
        const filePath = path.join(this.workspaceRoot, step.target);
        const content = step.parameters.content || '';
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content);
        return `File created: ${filePath}`;
    }
    async modifyFile(step) {
        const filePath = path.join(this.workspaceRoot, step.target);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        let content = fs.readFileSync(filePath, 'utf-8');
        const modification = step.parameters.modification;
        if (modification) {
            content = modification;
        }
        fs.writeFileSync(filePath, content);
        return `File modified: ${filePath}`;
    }
    async deleteFile(step) {
        const filePath = path.join(this.workspaceRoot, step.target);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        fs.unlinkSync(filePath);
        return `File deleted: ${filePath}`;
    }
    async createFolder(step) {
        const folderPath = path.join(this.workspaceRoot, step.target);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        return `Folder created: ${folderPath}`;
    }
    async installPackage(step) {
        const packageManager = step.parameters.packageManager || 'npm';
        const packages = step.parameters.packages || [];
        if (packages.length === 0) {
            // Install all dependencies from package.json
            const command = packageManager === 'npm' ? 'npm install' : `${packageManager} install`;
            (0, child_process_1.execSync)(command, { cwd: this.workspaceRoot, stdio: 'inherit' });
            return `Installed all dependencies with ${packageManager}`;
        }
        const command = `${packageManager} install ${packages.join(' ')}`;
        (0, child_process_1.execSync)(command, { cwd: this.workspaceRoot, stdio: 'inherit' });
        return `Installed packages: ${packages.join(', ')}`;
    }
    async runCommand(step) {
        const command = step.parameters.command || step.target;
        const output = (0, child_process_1.execSync)(command, { cwd: this.workspaceRoot, encoding: 'utf-8' });
        return output || `Command executed: ${command}`;
    }
    async generateCode(step) {
        // Placeholder for code generation
        const targetPath = path.join(this.workspaceRoot, step.target);
        return `Generated code for ${targetPath}`;
    }
    async analyzeCode(step) {
        // Placeholder for code analysis
        const targetPath = path.join(this.workspaceRoot, step.target);
        return `Analyzed code structure of ${targetPath}`;
    }
    async updateConfig(step) {
        // Placeholder for config updates
        return `Updated configuration`;
    }
    async attemptRecovery(step, error) {
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
                    }
                    catch (retryError) {
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
    async validateCheckpoint(checkpoint) {
        // Implement checkpoint validation logic
        return true;
    }
    createError(step, error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorType = this.categorizeError(errorMessage);
        return {
            id: (0, uuid_1.v4)(),
            type: errorType,
            message: errorMessage,
            context: `During step: ${step.description}`,
            suggestion: this.suggestFix(errorType),
            severity: this.determineSeverity(errorType),
            recoverable: this.isRecoverable(errorType),
        };
    }
    categorizeError(message) {
        if (message.includes('ENOENT') || message.includes('not found'))
            return agent_1.ErrorType.FILE_NOT_FOUND;
        if (message.includes('EACCES') || message.includes('permission'))
            return agent_1.ErrorType.PERMISSION_DENIED;
        if (message.includes('EEXIST'))
            return agent_1.ErrorType.FILE_NOT_FOUND;
        if (message.includes('SyntaxError'))
            return agent_1.ErrorType.SYNTAX_ERROR;
        if (message.includes('timeout'))
            return agent_1.ErrorType.TIMEOUT;
        return agent_1.ErrorType.UNKNOWN;
    }
    suggestFix(errorType) {
        const suggestions = {
            [agent_1.ErrorType.FILE_NOT_FOUND]: 'Check if the file path is correct.',
            [agent_1.ErrorType.PERMISSION_DENIED]: 'Check file permissions or try running with appropriate privileges.',
            [agent_1.ErrorType.COMMAND_FAILED]: 'The command failed. Check for syntax errors.',
            [agent_1.ErrorType.PACKAGE_NOT_FOUND]: 'The package may not exist. Verify the package name.',
            [agent_1.ErrorType.SYNTAX_ERROR]: 'There\'s a syntax error in the code. Let me fix it.',
            [agent_1.ErrorType.DEPENDENCY_CONFLICT]: 'There\'s a dependency conflict. Let me resolve it.',
            [agent_1.ErrorType.TIMEOUT]: 'The operation timed out. Let me try again.',
            [agent_1.ErrorType.UNKNOWN]: 'An unknown error occurred. Let me investigate.',
        };
        return suggestions[errorType] || 'Let me try a different approach.';
    }
    determineSeverity(errorType) {
        if (errorType === agent_1.ErrorType.TIMEOUT || errorType === agent_1.ErrorType.COMMAND_FAILED)
            return 'warning';
        if (errorType === agent_1.ErrorType.SYNTAX_ERROR)
            return 'critical';
        return 'info';
    }
    isRecoverable(errorType) {
        const nonRecoverable = [agent_1.ErrorType.SYNTAX_ERROR, agent_1.ErrorType.PERMISSION_DENIED];
        return !nonRecoverable.includes(errorType);
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    getResults() {
        return this.results;
    }
    getErrors() {
        return this.errors;
    }
}
exports.ExecutionEngine = ExecutionEngine;
const createExecutionEngine = (workspaceRoot = process.cwd()) => {
    return new ExecutionEngine(workspaceRoot);
};
exports.createExecutionEngine = createExecutionEngine;
//# sourceMappingURL=executionEngine.js.map