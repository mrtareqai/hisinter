// ═══════════════════════════════════════════════════════════════
// Sinter AI — Context Provider ⭐
// Powers the @ mention system — searches files, symbols, and
// workspace context for injection into chat
// ═══════════════════════════════════════════════════════════════

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// ─── Types ──────────────────────────────────────────────────

export interface ContextItem {
    type: 'file' | 'folder' | 'symbol' | 'problems' | 'terminal';
    label: string;
    description: string;
    detail?: string;
    filePath?: string;
    icon: string;
}

export interface ResolvedContext {
    tag: string;
    type: string;
    content: string;
    filePath?: string;
    lines?: number;
}

// ─── Icon mapping ───────────────────────────────────────────
const EXT_ICONS: Record<string, string> = {
    '.ts': '📘', '.js': '📙', '.tsx': '📘', '.jsx': '📙',
    '.py': '🐍', '.dart': '🎯', '.json': '⚙️', '.md': '📝',
    '.css': '🎨', '.html': '🌐', '.yaml': '📋', '.yml': '📋',
    '.sql': '🗄️', '.sh': '💻', '.ps1': '💻', '.bat': '💻',
};

// ─── Context Provider ───────────────────────────────────────

export class ContextProvider {
    private workspaceRoot: string;
    private lastTerminalOutput: string = '';

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    setLastTerminalOutput(output: string): void {
        this.lastTerminalOutput = output;
    }

    /** Search workspace for files/symbols matching query */
    async search(query: string): Promise<ContextItem[]> {
        const results: ContextItem[] = [];
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
            const files = await vscode.workspace.findFiles(
                `**/*${query}*`,
                '**/node_modules/**',
                20
            );

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
        } catch { /* skip */ }

        // Search folders
        try {
            const allFiles = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 100);
            const dirs = new Set<string>();

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
        } catch { /* skip */ }

        // Search symbols
        try {
            const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
                'vscode.executeWorkspaceSymbolProvider', query
            );

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
        } catch { /* skip */ }

        return results;
    }

    /** Resolve a context reference to actual content */
    async resolve(item: ContextItem): Promise<ResolvedContext> {
        switch (item.type) {
            case 'file': {
                if (!item.filePath) { return { tag: item.label, type: 'file', content: 'File not found' }; }
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
                } catch {
                    return { tag: item.label, type: 'file', content: 'Cannot read file' };
                }
            }

            case 'folder': {
                if (!item.filePath) { return { tag: item.label, type: 'folder', content: 'Folder not found' }; }
                try {
                    const entries = fs.readdirSync(item.filePath, { withFileTypes: true });
                    const listing = entries
                        .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
                        .map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`)
                        .join('\n');
                    return { tag: item.label, type: 'folder', content: listing, filePath: item.filePath };
                } catch {
                    return { tag: item.label, type: 'folder', content: 'Cannot list folder' };
                }
            }

            case 'symbol': {
                if (!item.filePath) { return { tag: item.label, type: 'symbol', content: 'Symbol not found' }; }
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
                } catch {
                    return { tag: item.label, type: 'symbol', content: 'Cannot read symbol' };
                }
            }

            case 'problems': {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { return { tag: '@problems', type: 'problems', content: 'No active file' }; }
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
    buildContextString(contexts: ResolvedContext[]): string {
        if (contexts.length === 0) { return ''; }

        const parts: string[] = ['\n--- Referenced Context ---'];
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
