// ═══════════════════════════════════════════════════════════════
// Sinter AI — Terminal / Code Tool
// Execute commands and run code
// ═══════════════════════════════════════════════════════════════

import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { ToolDefinition, ToolResult } from './toolRegistry';

export function createTerminalTools(workspaceRoot: string): ToolDefinition[] {
    return [
        {
            name: 'terminal_run',
            description: 'Execute a shell command in PowerShell and return the output. Use for running scripts, installing packages, git commands, etc.',
            parameters: {
                command: { type: 'string', description: 'The shell command to execute' },
                cwd: { type: 'string', description: 'Working directory (optional, defaults to workspace root)', required: false },
            },
            execute: async (args): Promise<ToolResult> => {
                const cwd = args.cwd ? path.resolve(workspaceRoot, args.cwd as string) : workspaceRoot;
                const command = args.command as string;

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
            execute: async (args): Promise<ToolResult> => {
                const code = args.code as string;
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
            execute: async (args): Promise<ToolResult> => {
                if (!args.filename) {
                    return { success: false, output: 'Missing required argument: filename' };
                }
                const fs = require('fs');
                const filePath = path.resolve(workspaceRoot, args.filename as string);
                try {
                    if (!await confirmCreateFile(filePath)) {
                        return { success: false, output: `Create file cancelled by user: ${filePath}` };
                    }
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    const content = args.content ? String(args.content) : '';
                    fs.writeFileSync(filePath, content, 'utf-8');
                    return { success: true, output: `Created file: ${filePath}` };
                } catch (e) {
                    return { success: false, output: `Failed to create file: ${(e as Error).message}` };
                }
            },
        },
    ];
}

async function confirmCreateFile(filePath: string): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('sinter');
    if (!config.get<boolean>('requireEditApproval', true)) {
        return true;
    }
    const choice = await vscode.window.showWarningMessage(
        `Sinter wants to create or overwrite file:\n${filePath}`,
        { modal: true },
        'Approve Create'
    );
    return choice === 'Approve Create';
}
