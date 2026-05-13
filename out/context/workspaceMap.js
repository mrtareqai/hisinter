"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Workspace Map
// Generates a compact project tree for context injection.
// Designed to stay under 40 lines to fit in small model context.
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
exports.invalidateWorkspaceMap = exports.getCompactWorkspaceMap = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
// ─── Cache ──────────────────────────────────────────────────
let cachedMap = null;
const CACHE_TTL = 5000; // 5 seconds
/**
 * Generate a compact workspace map string for injection into prompts.
 * Max 40 lines to stay within 6.7B model context budget.
 */
function getCompactWorkspaceMap(workspaceRoot) {
    if (cachedMap && cachedMap.root === workspaceRoot && Date.now() - cachedMap.at < CACHE_TTL) {
        return cachedMap.result;
    }
    const tree = scanDir(workspaceRoot, '', 0, 4);
    const lines = [];
    let fileCount = 0;
    flattenTree(tree, lines, '', 0);
    fileCount = lines.length;
    // Trim to max 40 lines
    const maxLines = 40;
    let output;
    if (lines.length > maxLines) {
        const trimmed = lines.slice(0, maxLines);
        trimmed.push(`  ... and ${lines.length - maxLines} more files`);
        output = `[Workspace: ${path.basename(workspaceRoot)} — ${fileCount} files]\n${trimmed.join('\n')}`;
    }
    else {
        output = `[Workspace: ${path.basename(workspaceRoot)} — ${fileCount} items]\n${lines.join('\n')}`;
    }
    cachedMap = { root: workspaceRoot, at: Date.now(), result: output };
    return output;
}
exports.getCompactWorkspaceMap = getCompactWorkspaceMap;
/**
 * Invalidate the cached workspace map (call after file mutations).
 */
function invalidateWorkspaceMap() {
    cachedMap = null;
}
exports.invalidateWorkspaceMap = invalidateWorkspaceMap;
// ─── Scan directory recursively ─────────────────────────────
function scanDir(dir, relativeTo, depth, maxDepth) {
    if (depth > maxDepth) {
        return [];
    }
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const results = [];
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
function flattenTree(entries, lines, indent, depth) {
    for (const entry of entries) {
        if (entry.isDir && entry.children) {
            lines.push(`${indent}${entry.name}/`);
            flattenTree(entry.children, lines, indent + '  ', depth + 1);
        }
        else {
            lines.push(`${indent}${entry.name} (${entry.lines}L)`);
        }
    }
}
function isSourceFile(name) {
    const ext = path.extname(name).toLowerCase();
    return SOURCE_EXTS.has(ext);
}
function countLines(filePath) {
    try {
        const stat = fs.statSync(filePath);
        if (stat.size > 512 * 1024) {
            return 0;
        } // Skip files > 512KB
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.split(/\r?\n/).length;
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=workspaceMap.js.map