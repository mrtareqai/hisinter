"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — File Tool
// Read, write, delete, list files and directories
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
exports.createFileTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
function createFileTools(workspaceRoot) {
    return [
        {
            name: 'file_read',
            description: 'Read the contents of a file. Returns the file content as text.',
            parameters: {
                path: { type: 'string', description: 'Absolute or relative file path to read' },
            },
            execute: async (args) => {
                const filePath = resolvePath(args.path, workspaceRoot);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    return { success: true, output: content };
                }
                catch (e) {
                    return { success: false, output: `Cannot read file: ${e.message}` };
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
            execute: async (args) => {
                const filePath = resolvePath(args.path, workspaceRoot);
                try {
                    if (!await confirmFileMutation('write', filePath)) {
                        return { success: false, output: `Write cancelled by user: ${filePath}` };
                    }
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    fs.writeFileSync(filePath, args.content, 'utf-8');
                    return { success: true, output: `File written: ${filePath}` };
                }
                catch (e) {
                    return { success: false, output: `Cannot write file: ${e.message}` };
                }
            },
        },
        {
            name: 'file_delete',
            description: 'Delete a file or empty directory.',
            parameters: {
                path: { type: 'string', description: 'File path to delete' },
            },
            execute: async (args) => {
                const filePath = resolvePath(args.path, workspaceRoot);
                try {
                    if (!await confirmFileMutation('delete', filePath)) {
                        return { success: false, output: `Delete cancelled by user: ${filePath}` };
                    }
                    fs.rmSync(filePath, { recursive: true });
                    return { success: true, output: `Deleted: ${filePath}` };
                }
                catch (e) {
                    return { success: false, output: `Cannot delete: ${e.message}` };
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
            execute: async (args) => {
                const dirPath = resolvePath(args.path, workspaceRoot);
                try {
                    const entries = listDirectory(dirPath, args.recursive === 'true', '');
                    return { success: true, output: entries.join('\n') };
                }
                catch (e) {
                    return { success: false, output: `Cannot list directory: ${e.message}` };
                }
            },
        },
        {
            name: 'file_search',
            description: 'Search for files by name pattern (glob-like) in the workspace.',
            parameters: {
                pattern: { type: 'string', description: 'Filename pattern to search for (e.g., "*.ts", "index.html")' },
            },
            execute: async (args) => {
                const pattern = args.pattern.toLowerCase();
                const matches = [];
                searchFiles(workspaceRoot, pattern, matches, 0, 5);
                if (matches.length === 0) {
                    return { success: true, output: 'No files found matching pattern.' };
                }
                return { success: true, output: matches.join('\n') };
            },
        },
    ];
}
exports.createFileTools = createFileTools;
function resolvePath(p, root) {
    if (path.isAbsolute(p)) {
        return p;
    }
    return path.resolve(root, p);
}
async function confirmFileMutation(action, filePath) {
    const config = vscode.workspace.getConfiguration('sinter');
    if (!config.get('requireEditApproval', true)) {
        return true;
    }
    const label = action === 'write' ? 'Approve Write' : 'Approve Delete';
    const choice = await vscode.window.showWarningMessage(`Sinter wants to ${action} file:\n${filePath}`, { modal: true }, label);
    return choice === label;
}
function listDirectory(dirPath, recursive, prefix) {
    const entries = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules') {
            continue;
        }
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
            entries.push(`${prefix}[DIR]  ${item.name}/`);
            if (recursive) {
                entries.push(...listDirectory(fullPath, true, prefix + '  '));
            }
        }
        else {
            const size = fs.statSync(fullPath).size;
            entries.push(`${prefix}[FILE] ${item.name} (${formatSize(size)})`);
        }
    }
    return entries;
}
function searchFiles(dir, pattern, results, depth, maxDepth) {
    if (depth > maxDepth || results.length > 50) {
        return;
    }
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            if (item.name.startsWith('.') || item.name === 'node_modules') {
                continue;
            }
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                searchFiles(fullPath, pattern, results, depth + 1, maxDepth);
            }
            else if (matchPattern(item.name.toLowerCase(), pattern)) {
                results.push(fullPath);
            }
        }
    }
    catch { /* skip inaccessible dirs */ }
}
function matchPattern(name, pattern) {
    if (pattern.startsWith('*')) {
        return name.endsWith(pattern.slice(1));
    }
    return name.includes(pattern);
}
function formatSize(bytes) {
    if (bytes < 1024) {
        return bytes + 'B';
    }
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + 'KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}
//# sourceMappingURL=fileTool.js.map