// ═══════════════════════════════════════════════════════════════
// Sinter AI — Workspace Map
// Generates a compact project tree for context injection.
// Designed to stay under 40 lines to fit in small model context.
// ═══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';

// Directories to always skip
const SKIP_DIRS = new Set([
    'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'out',
    '.next', '.nuxt', '__pycache__', '.cache', 'coverage', '.vscode',
    '.idea', 'vendor', 'target', '.dart_tool', '.pub-cache',
]);

// Extensions considered source files
const SOURCE_EXTS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.py', '.dart', '.go', '.rs', '.java',
    '.cs', '.php', '.rb', '.vue', '.svelte', '.html', '.css', '.scss',
    '.json', '.yaml', '.yml', '.md', '.sql', '.sh', '.ps1', '.bat',
    '.mq5', '.mq4', '.mqh', '.xml', '.toml', '.cfg', '.ini',
]);

interface FileEntry {
    name: string;
    relativePath: string;
    lines: number;
    isDir: boolean;
    children?: FileEntry[];
}

// ─── Cache ──────────────────────────────────────────────────
let cachedMap: { root: string; at: number; result: string } | null = null;
const CACHE_TTL = 5000; // 5 seconds

/**
 * Generate a compact workspace map string for injection into prompts.
 * Max 40 lines to stay within 6.7B model context budget.
 */
export function getCompactWorkspaceMap(workspaceRoot: string): string {
    if (cachedMap && cachedMap.root === workspaceRoot && Date.now() - cachedMap.at < CACHE_TTL) {
        return cachedMap.result;
    }

    const tree = scanDir(workspaceRoot, '', 0, 4);
    const lines: string[] = [];
    let fileCount = 0;

    flattenTree(tree, lines, '', 0);
    fileCount = lines.length;

    // Trim to max 40 lines
    const maxLines = 40;
    let output: string;
    if (lines.length > maxLines) {
        const trimmed = lines.slice(0, maxLines);
        trimmed.push(`  ... and ${lines.length - maxLines} more files`);
        output = `[Workspace: ${path.basename(workspaceRoot)} — ${fileCount} files]\n${trimmed.join('\n')}`;
    } else {
        output = `[Workspace: ${path.basename(workspaceRoot)} — ${fileCount} items]\n${lines.join('\n')}`;
    }

    cachedMap = { root: workspaceRoot, at: Date.now(), result: output };
    return output;
}

/**
 * Invalidate the cached workspace map (call after file mutations).
 */
export function invalidateWorkspaceMap(): void {
    cachedMap = null;
}

// ─── Scan directory recursively ─────────────────────────────

function scanDir(dir: string, relativeTo: string, depth: number, maxDepth: number): FileEntry[] {
    if (depth > maxDepth) { return []; }

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return [];
    }

    const results: FileEntry[] = [];

    // Sort: directories first, then files
    const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name));
    const files = entries.filter(e => e.isFile() && !e.name.startsWith('.') && isSourceFile(e.name));

    for (const d of dirs.sort((a, b) => a.name.localeCompare(b.name))) {
        const fullPath = path.join(dir, d.name);
        const relPath = relativeTo ? `${relativeTo}/${d.name}` : d.name;
        const children = scanDir(fullPath, relPath, depth + 1, maxDepth);
        if (children.length > 0) {
            results.push({ name: d.name, relativePath: relPath, lines: 0, isDir: true, children });
        }
    }

    for (const f of files.sort((a, b) => a.name.localeCompare(b.name))) {
        const fullPath = path.join(dir, f.name);
        const relPath = relativeTo ? `${relativeTo}/${f.name}` : f.name;
        const lines = countLines(fullPath);
        results.push({ name: f.name, relativePath: relPath, lines, isDir: false });
    }

    return results;
}

function flattenTree(entries: FileEntry[], lines: string[], indent: string, depth: number): void {
    for (const entry of entries) {
        if (entry.isDir && entry.children) {
            lines.push(`${indent}${entry.name}/`);
            flattenTree(entry.children, lines, indent + '  ', depth + 1);
        } else {
            lines.push(`${indent}${entry.name} (${entry.lines}L)`);
        }
    }
}

function isSourceFile(name: string): boolean {
    const ext = path.extname(name).toLowerCase();
    return SOURCE_EXTS.has(ext);
}

function countLines(filePath: string): number {
    try {
        const stat = fs.statSync(filePath);
        if (stat.size > 512 * 1024) { return 0; } // Skip files > 512KB
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.split(/\r?\n/).length;
    } catch {
        return 0;
    }
}
