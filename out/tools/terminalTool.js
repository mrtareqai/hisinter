"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Terminal / Code Tool
// Execute commands and run code
// ═══════════════════════════════════════════════════════════════
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
exports.createTerminalTools = void 0;
const cp = __importStar(require("child_process"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
function createTerminalTools(workspaceRoot) {
    return [
        {
            name: 'terminal_run',
            description: 'Execute a shell command in PowerShell and return the output. Use for running scripts, installing packages, git commands, etc.',
            parameters: {
                command: { type: 'string', description: 'The shell command to execute' },
                cwd: { type: 'string', description: 'Working directory (optional, defaults to workspace root)', required: false },
            },
            execute: async (args) => {
                const cwd = args.cwd ? path.resolve(workspaceRoot, args.cwd) : workspaceRoot;
                const command = args.command;
                return new Promise((resolve) => {
                    cp.exec(command, {
                        cwd,
                        timeout: 30000,
                        maxBuffer: 1024 * 1024,
                        shell: 'powershell.exe',
                    }, (error, stdout, stderr) => {
                        const output = [
                            stdout ? `STDOUT:\n${stdout}` : '',
                            stderr ? `STDERR:\n${stderr}` : '',
                            error ? `ERROR: ${error.message}` : '',
                        ].filter(Boolean).join('\n');
                        resolve({
                            success: !error,
                            output: output || '(no output)',
                        });
                    });
                });
            },
        },
        {
            name: 'code_run_node',
            description: 'Execute JavaScript/Node.js code and return the output.',
            parameters: {
                code: { type: 'string', description: 'JavaScript code to execute' },
            },
            execute: async (args) => {
                const code = args.code;
                return new Promise((resolve) => {
                    cp.exec(`node -e "${code.replace(/"/g, '\\"')}"`, {
                        cwd: workspaceRoot,
                        timeout: 15000,
                        maxBuffer: 512 * 1024,
                    }, (error, stdout, stderr) => {
                        resolve({
                            success: !error,
                            output: stdout || stderr || (error?.message ?? '(no output)'),
                        });
                    });
                });
            },
        },
        {
            name: 'code_create_file',
            description: 'Create a new code file with the given content and optionally open it in the editor.',
            parameters: {
                filename: { type: 'string', description: 'Filename to create (relative to workspace)' },
                content: { type: 'string', description: 'File content' },
                language: { type: 'string', description: 'Programming language (e.g., python, javascript, typescript)', required: false },
            },
            execute: async (args) => {
                if (!args.filename) {
                    return { success: false, output: 'Missing required argument: filename' };
                }
                const fs = require('fs');
                const filePath = path.resolve(workspaceRoot, args.filename);
                try {
                    if (!await confirmCreateFile(filePath)) {
                        return { success: false, output: `Create file cancelled by user: ${filePath}` };
                    }
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    const content = args.content ? String(args.content) : '';
                    fs.writeFileSync(filePath, content, 'utf-8');
                    return { success: true, output: `Created file: ${filePath}` };
                }
                catch (e) {
                    return { success: false, output: `Failed to create file: ${e.message}` };
                }
            },
        },
    ];
}
exports.createTerminalTools = createTerminalTools;
async function confirmCreateFile(filePath) {
    const config = vscode.workspace.getConfiguration('sinter');
    if (!config.get('requireEditApproval', true)) {
        return true;
    }
    const choice = await vscode.window.showWarningMessage(`Sinter wants to create or overwrite file:\n${filePath}`, { modal: true }, 'Approve Create');
    return choice === 'Approve Create';
}
//# sourceMappingURL=terminalTool.js.map