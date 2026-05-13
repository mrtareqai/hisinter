"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Context Provider ⭐
// Powers the @ mention system — searches files, symbols, and
// workspace context for injection into chat
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
exports.ContextProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// ─── Icon mapping ───────────────────────────────────────────
const EXT_ICONS = {
    '.ts': '📘', '.js': '📙', '.tsx': '📘', '.jsx': '📙',
    '.py': '🐍', '.dart': '🎯', '.json': '⚙️', '.md': '📝',
    '.css': '🎨', '.html': '🌐', '.yaml': '📋', '.yml': '📋',
    '.sql': '🗄️', '.sh': '💻', '.ps1': '💻', '.bat': '💻',
};
// ─── Context Provider ───────────────────────────────────────
class ContextProvider {
    workspaceRoot;
    lastTerminalOutput = '';
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    setLastTerminalOutput(output) {
        this.lastTerminalOutput = output;
    }
    /** Search workspace for files/symbols matching query */
    async search(query) {
        const results = [];
        const lower = query.toLowerCase();
        // Special @ types
        if ('problems'.startsWith(lower) || 'مشاكل'.startsWith(lower)) {
            results.push({
                type: 'problems', label: '@problems',
                description: 'مشاكل الملف الحالي', icon: '⚠️',
            });
        }
        if ('terminal'.startsWith(lower) || 'تيرمنال'.startsWith(lower)) {
            results.push({
                type: 'terminal', label: '@terminal',
                description: 'آخر خرج من التيرمنال', icon: '💻',
            });
        }
        // Search files
        try {
            const files = await vscode.workspace.findFiles(`**/*${query}*`, '**/node_modules/**', 20);
            for (const file of files) {
                const relativePath = path.relative(this.workspaceRoot, file.fsPath).replace(/\\/g, '/');
                const ext = path.extname(file.fsPath);
                const icon = EXT_ICONS[ext] || '📄';
                const stat = fs.statSync(file.fsPath);
                if (stat.isFile()) {
                    results.push({
                        type: 'file',
                        label: `@${path.basename(file.fsPath)}`,
                        description: relativePath,
                        filePath: file.fsPath,
                        icon,
                    });
                }
            }
        }
        catch { /* skip */ }
        // Search folders
        try {
            const allFiles = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 100);
            const dirs = new Set();
            for (const file of allFiles) {
                const dir = path.dirname(path.relative(this.workspaceRoot, file.fsPath)).replace(/\\/g, '/');
                if (dir && dir !== '.' && dir.toLowerCase().includes(lower)) {
                    dirs.add(dir);
                }
            }
            for (const dir of Array.from(dirs).slice(0, 10)) {
                results.push({
                    type: 'folder',
                    label: `@${dir}/`,
                    description: 'مجلد',
                    filePath: path.join(this.workspaceRoot, dir),
                    icon: '📁',
                });
            }
        }
        catch { /* skip */ }
        // Search symbols
        try {
            const symbols = await vscode.commands.executeCommand('vscode.executeWorkspaceSymbolProvider', query);
            if (symbols) {
                for (const sym of symbols.slice(0, 10)) {
                    const symIcon = sym.kind === vscode.SymbolKind.Class ? '📦' :
                        sym.kind === vscode.SymbolKind.Function ? '🔧' :
                            sym.kind === vscode.SymbolKind.Interface ? '📐' : '🔹';
                    results.push({
                        type: 'symbol',
                        label: `@${sym.name}`,
                        description: `${vscode.SymbolKind[sym.kind]} in ${path.basename(sym.location.uri.fsPath)}`,
                        filePath: sym.location.uri.fsPath,
                        icon: symIcon,
                    });
                }
            }
        }
        catch { /* skip */ }
        return results;
    }
    /** Resolve a context reference to actual content */
    async resolve(item) {
        switch (item.type) {
            case 'file': {
                if (!item.filePath) {
                    return { tag: item.label, type: 'file', content: 'File not found' };
                }
                try {
                    const content = fs.readFileSync(item.filePath, 'utf-8');
                    const lines = content.split('\n').length;
                    return {
                        tag: item.label,
                        type: 'file',
                        content: content.substring(0, 8000),
                        filePath: item.filePath,
                        lines,
                    };
                }
                catch {
                    return { tag: item.label, type: 'file', content: 'Cannot read file' };
                }
            }
            case 'folder': {
                if (!item.filePath) {
                    return { tag: item.label, type: 'folder', content: 'Folder not found' };
                }
                try {
                    const entries = fs.readdirSync(item.filePath, { withFileTypes: true });
                    const listing = entries
                        .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
                        .map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`)
                        .join('\n');
                    return { tag: item.label, type: 'folder', content: listing, filePath: item.filePath };
                }
                catch {
                    return { tag: item.label, type: 'folder', content: 'Cannot list folder' };
                }
            }
            case 'symbol': {
                if (!item.filePath) {
                    return { tag: item.label, type: 'symbol', content: 'Symbol not found' };
                }
                try {
                    const content = fs.readFileSync(item.filePath, 'utf-8');
                    // Find the symbol definition
                    const symbolName = item.label.replace('@', '');
                    const lines = content.split('\n');
                    let startLine = -1;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes(symbolName) &&
                            (lines[i].includes('class ') || lines[i].includes('function ') ||
                                lines[i].includes('interface ') || lines[i].includes('const '))) {
                            startLine = i;
                            break;
                        }
                    }
                    if (startLine >= 0) {
                        // Get the symbol + some context
                        const snippet = lines.slice(startLine, Math.min(startLine + 50, lines.length)).join('\n');
                        return { tag: item.label, type: 'symbol', content: snippet, filePath: item.filePath, lines: 50 };
                    }
                    return { tag: item.label, type: 'symbol', content: content.substring(0, 3000), filePath: item.filePath };
                }
                catch {
                    return { tag: item.label, type: 'symbol', content: 'Cannot read symbol' };
                }
            }
            case 'problems': {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return { tag: '@problems', type: 'problems', content: 'No active file' };
                }
                const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
                if (diagnostics.length === 0) {
                    return { tag: '@problems', type: 'problems', content: 'No problems found ✅' };
                }
                const problems = diagnostics
                    .slice(0, 20)
                    .map(d => `Line ${d.range.start.line + 1}: [${d.severity === 0 ? 'ERROR' : 'WARN'}] ${d.message}`)
                    .join('\n');
                return {
                    tag: '@problems', type: 'problems', content: problems,
                    filePath: editor.document.uri.fsPath,
                };
            }
            case 'terminal': {
                return {
                    tag: '@terminal', type: 'terminal',
                    content: this.lastTerminalOutput || 'No terminal output captured',
                };
            }
            default:
                return { tag: item.label, type: 'unknown', content: '' };
        }
    }
    /** Build context string from multiple resolved references */
    buildContextString(contexts) {
        if (contexts.length === 0) {
            return '';
        }
        const parts = ['\n--- Referenced Context ---'];
        for (const ctx of contexts) {
            parts.push(`\n[${ctx.tag}] (${ctx.type}${ctx.lines ? ', ' + ctx.lines + ' lines' : ''}):`);
            parts.push('```');
            parts.push(ctx.content);
            parts.push('```');
        }
        parts.push('--- End Context ---\n');
        return parts.join('\n');
    }
}
exports.ContextProvider = ContextProvider;
//# sourceMappingURL=contextProvider.js.map