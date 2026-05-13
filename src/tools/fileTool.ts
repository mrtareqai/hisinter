// ═══════════════════════════════════════════════════════════════
// Sinter AI — File Tool
// Read, write, delete, list files and directories
// ═══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ToolDefinition, ToolResult } from './toolRegistry';

export function createFileTools(workspaceRoot: string): ToolDefinition[] {
    return [
        {
            name: 'file_read',
            description: 'Read the contents of a file. Returns the file content as text.',
            parameters: {
                path: { type: 'string', description: 'Absolute or relative file path to read' },
            },
            execute: async (args): Promise<ToolResult> => {
                const filePath = resolvePath(args.path as string, workspaceRoot);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    return { success: true, output: content };
                } catch (e) {
                    return { success: false, output: `Cannot read file: ${(e as Error).message}` };
                }
            },
        },
        {
            name: 'file_write',
            description: 'Write content to a file. Creates the file and parent directories if they do not exist.',
            parameters: {
                path: { type: 'string', description: 'File path to write to' },
                content: { type: 'string', description: 'Content to write' },
            },
            execute: async (args): Promise<ToolResult> => {
                const filePath = resolvePath(args.path as string, workspaceRoot);
                try {
                    if (!await confirmFileMutation('write', filePath)) {
                        return { success: false, output: `Write cancelled by user: ${filePath}` };
                    }
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    fs.writeFileSync(filePath, args.content as string, 'utf-8');
                    return { success: true, output: `File written: ${filePath}` };
                } catch (e) {
                    return { success: false, output: `Cannot write file: ${(e as Error).message}` };
                }
            },
        },
        {
            name: 'file_delete',
            description: 'Delete a file or empty directory.',
            parameters: {
                path: { type: 'string', description: 'File path to delete' },
            },
            execute: async (args): Promise<ToolResult> => {
                const filePath = resolvePath(args.path as string, workspaceRoot);
                try {
                    if (!await confirmFileMutation('delete', filePath)) {
                        return { success: false, output: `Delete cancelled by user: ${filePath}` };
                    }
                    fs.rmSync(filePath, { recursive: true });
                    return { success: true, output: `Deleted: ${filePath}` };
                } catch (e) {
                    return { success: false, output: `Cannot delete: ${(e as Error).message}` };
                }
            },
        },
        {
            name: 'file_list',
            description: 'List files and directories in a given path. Returns names with [DIR] or [FILE] prefix.',
            parameters: {
                path: { type: 'string', description: 'Directory path to list' },
                recursive: { type: 'string', description: '"true" to list recursively, "false" for top-level only', required: false },
            },
            execute: async (args): Promise<ToolResult> => {
                const dirPath = resolvePath(args.path as string, workspaceRoot);
                try {
                    const entries = listDirectory(dirPath, args.recursive === 'true', '');
                    return { success: true, output: entries.join('\n') };
                } catch (e) {
                    return { success: false, output: `Cannot list directory: ${(e as Error).message}` };
                }
            },
        },
        {
            name: 'file_search',
            description: 'Search for files by name pattern (glob-like) in the workspace.',
            parameters: {
                pattern: { type: 'string', description: 'Filename pattern to search for (e.g., "*.ts", "index.html")' },
            },
            execute: async (args): Promise<ToolResult> => {
                const pattern = (args.pattern as string).toLowerCase();
                const matches: string[] = [];
                searchFiles(workspaceRoot, pattern, matches, 0, 5);
                if (matches.length === 0) {
                    return { success: true, output: 'No files found matching pattern.' };
                }
                return { success: true, output: matches.join('\n') };
            },
        },
    ];
}

function resolvePath(p: string, root: string): string {
    if (path.isAbsolute(p)) { return p; }
    return path.resolve(root, p);
}

async function confirmFileMutation(action: 'write' | 'delete', filePath: string): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('sinter');
    if (!config.get<boolean>('requireEditApproval', true)) {
        return true;
    }
    const label = action === 'write' ? 'Approve Write' : 'Approve Delete';
    const choice = await vscode.window.showWarningMessage(
        `Sinter wants to ${action} file:\n${filePath}`,
        { modal: true },
        label
    );
    return choice === label;
}

function listDirectory(dirPath: string, recursive: boolean, prefix: string): string[] {
    const entries: string[] = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules') { continue; }
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
            entries.push(`${prefix}[DIR]  ${item.name}/`);
            if (recursive) {
                entries.push(...listDirectory(fullPath, true, prefix + '  '));
            }
        } else {
            const size = fs.statSync(fullPath).size;
            entries.push(`${prefix}[FILE] ${item.name} (${formatSize(size)})`);
        }
    }
    return entries;
}

function searchFiles(dir: string, pattern: string, results: string[], depth: number, maxDepth: number): void {
    if (depth > maxDepth || results.length > 50) { return; }
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            if (item.name.startsWith('.') || item.name === 'node_modules') { continue; }
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                searchFiles(fullPath, pattern, results, depth + 1, maxDepth);
            } else if (matchPattern(item.name.toLowerCase(), pattern)) {
                results.push(fullPath);
            }
        }
    } catch { /* skip inaccessible dirs */ }
}

function matchPattern(name: string, pattern: string): boolean {
    if (pattern.startsWith('*')) {
        return name.endsWith(pattern.slice(1));
    }
    return name.includes(pattern);
}

function formatSize(bytes: number): string {
    if (bytes < 1024) { return bytes + 'B'; }
    if (bytes < 1024 * 1024) { return (bytes / 1024).toFixed(1) + 'KB'; }
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}
