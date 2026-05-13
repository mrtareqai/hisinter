// ═══════════════════════════════════════════════════════════════
// Sinter AI — Codebase Explorer ⭐
// Scans the entire project and builds a comprehensive map
// Like how a professional AI assistant reads every file first
// ═══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';
import { ProgressReporter } from './progressReporter';

// ─── Types ──────────────────────────────────────────────────

export interface FileNode {
    name: string;
    path: string;
    isDir: boolean;
    size?: number;
    children?: FileNode[];
}

export interface FileAnalysis {
    path: string;
    relativePath: string;
    language: string;
    lines: number;
    size: number;
    content: string;
    exports: string[];
    imports: string[];
    classes: string[];
    functions: string[];
    complexity: 'low' | 'medium' | 'high';
}

export interface DependencyEdge {
    from: string;   // file that imports
    to: string;     // file being imported
}

export interface ProjectStats {
    totalFiles: number;
    totalSourceFiles: number;
    totalLines: number;
    totalSize: number;
    languages: Record<string, number>;
    largestFiles: { path: string; lines: number }[];
}

export interface ProjectMap {
    root: string;
    structure: FileNode[];
    configFiles: string[];
    sourceFiles: FileAnalysis[];
    dependencies: DependencyEdge[];
    stats: ProjectStats;
}

// ─── Skip patterns ──────────────────────────────────────────
const SKIP_DIRS = new Set([
    'node_modules', '.git', '.vscode', 'out', 'dist', 'build',
    '.next', '__pycache__', '.cache', 'coverage', '.svn',
]);

const SKIP_FILES = new Set([
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
]);

const SOURCE_EXTENSIONS = new Set([
    '.ts', '.js', '.tsx', '.jsx', '.py', '.dart', '.java',
    '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.rb', '.php',
    '.vue', '.svelte', '.mjs', '.cjs',
]);

const CONFIG_EXTENSIONS = new Set([
    '.json', '.yaml', '.yml', '.toml', '.xml', '.env',
    '.config.js', '.config.ts',
]);

const CONFIG_NAMES = new Set([
    'package.json', 'tsconfig.json', 'pubspec.yaml',
    '.eslintrc', '.prettierrc', 'Dockerfile', 'docker-compose.yml',
    'Makefile', 'CMakeLists.txt', 'Cargo.toml', 'go.mod',
]);

const LANG_MAP: Record<string, string> = {
    '.ts': 'TypeScript', '.js': 'JavaScript', '.tsx': 'TypeScript',
    '.jsx': 'JavaScript', '.py': 'Python', '.dart': 'Dart',
    '.java': 'Java', '.cpp': 'C++', '.c': 'C', '.h': 'C/C++',
    '.cs': 'C#', '.go': 'Go', '.rs': 'Rust', '.rb': 'Ruby',
    '.php': 'PHP', '.vue': 'Vue', '.svelte': 'Svelte',
    '.json': 'JSON', '.md': 'Markdown', '.yaml': 'YAML',
};

// ─── Explorer ───────────────────────────────────────────────

export class CodebaseExplorer {

    /** Full project scan — reads every source file */
    async fullScan(workspaceRoot: string, reporter?: ProgressReporter): Promise<ProjectMap> {
        reporter?.exploring(workspaceRoot);

        // 1. Build file tree
        const structure = this.buildTree(workspaceRoot, 0, 5);
        const allFiles = this.flattenTree(structure);

        const configFiles = allFiles.filter(f =>
            CONFIG_NAMES.has(path.basename(f)) || CONFIG_EXTENSIONS.has(path.extname(f))
        );
        const sourceFilePaths = allFiles.filter(f =>
            SOURCE_EXTENSIONS.has(path.extname(f))
        );

        reporter?.foundStructure(
            allFiles.filter(f => f.endsWith('/')).length || 0,
            sourceFilePaths.length
        );

        // 2. Read and analyze each source file
        const sourceFiles: FileAnalysis[] = [];
        for (const filePath of sourceFilePaths) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n').length;
                const analysis = this.analyzeFile(filePath, workspaceRoot, content);
                sourceFiles.push(analysis);
                reporter?.readingFile(filePath, lines);
            } catch {
                // Skip unreadable files
            }
        }

        // 3. Read config files
        for (const cf of configFiles.slice(0, 5)) {
            reporter?.readingConfig(cf);
        }

        // 4. Build dependency graph
        reporter?.buildingDependencyGraph();
        const dependencies = this.buildDependencies(sourceFiles, workspaceRoot);

        // 5. Compute stats
        const stats = this.computeStats(sourceFiles);
        reporter?.foundStats(stats.totalSourceFiles, stats.totalLines, 0);

        return {
            root: workspaceRoot,
            structure,
            configFiles,
            sourceFiles,
            dependencies,
            stats,
        };
    }

    /** Quick scan — only reads specified files */
    async quickScan(workspaceRoot: string, targetFiles: string[], reporter?: ProgressReporter): Promise<ProjectMap> {
        const sourceFiles: FileAnalysis[] = [];

        for (const filePath of targetFiles) {
            const full = path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
            try {
                const content = fs.readFileSync(full, 'utf-8');
                sourceFiles.push(this.analyzeFile(full, workspaceRoot, content));
                reporter?.readingFile(full, content.split('\n').length);
            } catch { /* skip */ }
        }

        return {
            root: workspaceRoot,
            structure: [],
            configFiles: [],
            sourceFiles,
            dependencies: this.buildDependencies(sourceFiles, workspaceRoot),
            stats: this.computeStats(sourceFiles),
        };
    }

    /** Find files relevant to a specific task description */
    findRelevantFiles(projectMap: ProjectMap, taskDescription: string): string[] {
        const lower = taskDescription.toLowerCase();
        const scored: { path: string; score: number }[] = [];

        for (const f of projectMap.sourceFiles) {
            let score = 0;
            const basename = path.basename(f.path).toLowerCase();

            // Check if filename is mentioned
            if (lower.includes(basename.replace(/\.\w+$/, ''))) { score += 10; }

            // Check if exports/classes are mentioned
            for (const exp of [...f.exports, ...f.classes, ...f.functions]) {
                if (lower.includes(exp.toLowerCase())) { score += 5; }
            }

            // Bonus for entry points
            if (basename.includes('main') || basename.includes('index') || basename.includes('extension')) {
                score += 2;
            }

            // Bonus for larger files (likely more important)
            if (f.lines > 200) { score += 1; }

            if (score > 0) { scored.push({ path: f.path, score }); }
        }

        scored.sort((a, b) => b.score - a.score);
        return scored.map(s => s.path);
    }

    // ─── Private Helpers ────────────────────────────────────

    private buildTree(dir: string, depth: number, maxDepth: number): FileNode[] {
        if (depth > maxDepth) { return []; }
        const nodes: FileNode[] = [];

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.') && depth === 0 && entry.name !== '.env') { continue; }
                if (SKIP_DIRS.has(entry.name)) { continue; }
                if (SKIP_FILES.has(entry.name)) { continue; }

                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    nodes.push({
                        name: entry.name,
                        path: fullPath,
                        isDir: true,
                        children: this.buildTree(fullPath, depth + 1, maxDepth),
                    });
                } else {
                    try {
                        const stat = fs.statSync(fullPath);
                        if (stat.size < 1024 * 1024) { // Skip files > 1MB
                            nodes.push({ name: entry.name, path: fullPath, isDir: false, size: stat.size });
                        }
                    } catch { /* skip */ }
                }
            }
        } catch { /* skip inaccessible dirs */ }

        return nodes;
    }

    private flattenTree(nodes: FileNode[]): string[] {
        const result: string[] = [];
        for (const node of nodes) {
            if (node.isDir && node.children) {
                result.push(...this.flattenTree(node.children));
            } else {
                result.push(node.path);
            }
        }
        return result;
    }

    private analyzeFile(filePath: string, root: string, content: string): FileAnalysis {
        const ext = path.extname(filePath);
        const lines = content.split('\n');
        const relativePath = path.relative(root, filePath).replace(/\\/g, '/');

        // Extract exports
        const exports: string[] = [];
        const classes: string[] = [];
        const functions: string[] = [];
        const imports: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Exports
            const exportMatch = trimmed.match(/export\s+(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/);
            if (exportMatch) { exports.push(exportMatch[1]); }

            // Classes
            const classMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)/);
            if (classMatch) { classes.push(classMatch[1]); }

            // Functions
            const funcMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
            if (funcMatch) { functions.push(funcMatch[1]); }

            // Imports (relative)
            const importMatch = trimmed.match(/from\s+['"](\.[^'"]+)['"]/);
            if (importMatch) { imports.push(importMatch[1]); }

            // Python imports
            const pyImport = trimmed.match(/^(?:from|import)\s+(\w+)/);
            if (pyImport && ext === '.py') { imports.push(pyImport[1]); }
        }

        // Complexity heuristic
        let complexity: 'low' | 'medium' | 'high' = 'low';
        if (lines.length > 300 || classes.length > 3) { complexity = 'high'; }
        else if (lines.length > 100 || classes.length > 1) { complexity = 'medium'; }

        return {
            path: filePath,
            relativePath,
            language: LANG_MAP[ext] || ext,
            lines: lines.length,
            size: Buffer.byteLength(content),
            content,
            exports,
            imports,
            classes,
            functions,
            complexity,
        };
    }

    private buildDependencies(files: FileAnalysis[], root: string): DependencyEdge[] {
        const edges: DependencyEdge[] = [];
        const fileMap = new Map(files.map(f => [f.relativePath, f]));

        for (const file of files) {
            for (const imp of file.imports) {
                // Resolve relative import
                const dir = path.dirname(file.path);
                const candidates = [
                    path.resolve(dir, imp),
                    path.resolve(dir, imp + '.ts'),
                    path.resolve(dir, imp + '.js'),
                    path.resolve(dir, imp, 'index.ts'),
                    path.resolve(dir, imp, 'index.js'),
                ];

                for (const candidate of candidates) {
                    const rel = path.relative(root, candidate).replace(/\\/g, '/');
                    if (fileMap.has(rel)) {
                        edges.push({ from: file.relativePath, to: rel });
                        break;
                    }
                }
            }
        }

        return edges;
    }

    private computeStats(files: FileAnalysis[]): ProjectStats {
        const languages: Record<string, number> = {};
        let totalLines = 0;
        let totalSize = 0;

        for (const f of files) {
            totalLines += f.lines;
            totalSize += f.size;
            languages[f.language] = (languages[f.language] || 0) + f.lines;
        }

        const sorted = [...files].sort((a, b) => b.lines - a.lines);

        return {
            totalFiles: files.length,
            totalSourceFiles: files.length,
            totalLines,
            totalSize,
            languages,
            largestFiles: sorted.slice(0, 5).map(f => ({ path: f.relativePath, lines: f.lines })),
        };
    }
}
