"use strict";
/**
 * Deep Workspace Graph - Real-time project understanding
 *
 * Builds a comprehensive graph of your project:
 * - File and folder structure
 * - Dependencies between files
 * - Imports and exports
 * - Architecture patterns
 * - Impact analysis for changes
 * - Smart context selection
 */
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
exports.initializeGlobalWorkspaceGraph = exports.globalWorkspaceGraph = exports.WorkspaceGraph = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class WorkspaceGraph {
    graph;
    fileExtensionMap = new Map();
    ignorePatterns = [
        'node_modules',
        '.git',
        '.next',
        'dist',
        'build',
        '.vscode',
        '.idea',
        '*.log',
        '.env*'
    ];
    constructor(root) {
        this.graph = {
            root,
            nodes: new Map(),
            patterns: [],
            timestamp: Date.now(),
            totalFiles: 0,
            totalDirectories: 0
        };
        this.setupFileExtensionMap();
        console.log('[WorkspaceGraph] Initialized');
    }
    /**
     * Build graph from workspace
     */
    async buildGraph() {
        console.log('[WorkspaceGraph] Building workspace graph...');
        const startTime = performance.now();
        // Recursively scan directory
        await this.scanDirectory(this.graph.root, this.graph.root);
        // Analyze dependencies
        await this.analyzeDependencies();
        // Detect patterns
        this.detectPatterns();
        this.graph.timestamp = Date.now();
        const duration = performance.now() - startTime;
        console.log(`[WorkspaceGraph] Graph built in ${duration.toFixed(0)}ms ` +
            `(${this.graph.totalFiles} files, ${this.graph.totalDirectories} dirs)`);
        return this.graph;
    }
    /**
     * Find all files that depend on a given file
     */
    findDependents(filePath) {
        const node = this.graph.nodes.get(filePath);
        if (!node)
            return [];
        return Array.from(node.dependents);
    }
    /**
     * Find all files that a file depends on
     */
    findDependencies(filePath) {
        const node = this.graph.nodes.get(filePath);
        if (!node)
            return [];
        return Array.from(node.dependencies);
    }
    /**
     * Analyze impact of changes to specific files
     */
    analyzeImpact(changedFiles) {
        const affected = new Set();
        const indirect = new Set();
        // Direct impact
        changedFiles.forEach(file => {
            const node = this.graph.nodes.get(file);
            if (node) {
                node.dependents.forEach(dep => affected.add(dep));
            }
        });
        // Indirect impact (one level)
        affected.forEach(file => {
            const node = this.graph.nodes.get(file);
            if (node) {
                node.dependents.forEach(dep => indirect.add(dep));
            }
        });
        // Remove direct from indirect
        indirect.forEach(f => {
            if (affected.has(f))
                indirect.delete(f);
        });
        const estimatedScope = changedFiles.length + affected.size + indirect.size;
        const riskLevel = estimatedScope > this.graph.totalFiles * 0.3 ? 'high' :
            estimatedScope > this.graph.totalFiles * 0.1 ? 'medium' :
                'low';
        return {
            changedFiles,
            directlyAffected: Array.from(affected),
            indirectlyAffected: Array.from(indirect),
            riskLevel,
            estimatedScope
        };
    }
    /**
     * Get context for a specific file - related files and their relevance
     */
    getContextForFile(filePath) {
        const node = this.graph.nodes.get(filePath);
        if (!node)
            return [];
        const context = [];
        const visited = new Set();
        // Add dependencies
        node.dependencies.forEach(dep => {
            if (!visited.has(dep)) {
                context.push({
                    path: dep,
                    relevanceScore: 0.9,
                    reason: 'Direct dependency',
                    distance: 1
                });
                visited.add(dep);
            }
        });
        // Add dependents
        node.dependents.forEach(dep => {
            if (!visited.has(dep)) {
                context.push({
                    path: dep,
                    relevanceScore: 0.8,
                    reason: 'Directly depends on this',
                    distance: 1
                });
                visited.add(dep);
            }
        });
        // Add same-directory files
        const dir = path.dirname(filePath);
        this.graph.nodes.forEach((n, nodePath) => {
            if (path.dirname(nodePath) === dir && nodePath !== filePath && !visited.has(nodePath)) {
                context.push({
                    path: nodePath,
                    relevanceScore: 0.6,
                    reason: 'Same directory',
                    distance: 1
                });
                visited.add(nodePath);
            }
        });
        // Sort by relevance
        return context.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    /**
     * Detect architecture patterns
     */
    detectPatterns() {
        const patterns = [];
        // Pattern 1: React component directory
        const reactDirs = this.findDirectoryPattern(/components?\/(.*)\.(tsx?|jsx?)$/i);
        if (reactDirs.length > 0) {
            patterns.push({
                id: 'react-components',
                name: 'React Component Structure',
                description: 'Project uses React with component-based architecture',
                files: reactDirs,
                confidence: 0.9
            });
        }
        // Pattern 2: API routes
        const apiRoutes = this.findDirectoryPattern(/api\/.*\.ts$/i);
        if (apiRoutes.length > 0) {
            patterns.push({
                id: 'api-routes',
                name: 'API Route Structure',
                description: 'Project has API routes structure',
                files: apiRoutes,
                confidence: 0.85
            });
        }
        // Pattern 3: Test files
        const testFiles = this.findDirectoryPattern(/\.test\.(ts|tsx|js|jsx)$/i);
        if (testFiles.length > 0) {
            patterns.push({
                id: 'test-structure',
                name: 'Test Structure',
                description: `Project has ${testFiles.length} test files`,
                files: testFiles.slice(0, 10),
                confidence: 0.8
            });
        }
        // Pattern 4: Monorepo structure
        const packageDirs = this.findDirectoryPattern(/package\.json$/i);
        if (packageDirs.length > 1) {
            patterns.push({
                id: 'monorepo',
                name: 'Monorepo Structure',
                description: 'Project appears to be a monorepo',
                files: packageDirs,
                confidence: 0.9
            });
        }
        this.graph.patterns = patterns;
    }
    /**
     * Get all detected patterns
     */
    getPatterns() {
        return [...this.graph.patterns];
    }
    /**
     * Get workspace statistics
     */
    getStatistics() {
        const stats = {
            totalFiles: this.graph.totalFiles,
            totalDirectories: this.graph.totalDirectories,
            totalSize: 0,
            filesByType: {},
            deepestPath: 0,
            mostDependencies: { file: '', count: 0 },
            highestComplexity: []
        };
        let maxDepth = 0;
        let maxDeps = 0;
        let maxDepsFile = '';
        this.graph.nodes.forEach((node, filepath) => {
            // Size
            stats.totalSize += node.size;
            // By type
            const ext = path.extname(filepath);
            stats.filesByType[ext] = (stats.filesByType[ext] || 0) + 1;
            // Depth
            const depth = filepath.split(path.sep).length;
            maxDepth = Math.max(maxDepth, depth);
            // Dependencies
            if (node.dependencies.size > maxDeps) {
                maxDeps = node.dependencies.size;
                maxDepsFile = filepath;
            }
            // Complexity
            if (node.complexity === 'high') {
                stats.highestComplexity.push(filepath);
            }
        });
        stats.deepestPath = maxDepth;
        stats.mostDependencies = { file: maxDepsFile, count: maxDeps };
        return stats;
    }
    /**
     * Private: Recursively scan directory
     */
    async scanDirectory(dir, root) {
        try {
            const entries = fs.readdirSync(dir);
            for (const entry of entries) {
                const fullPath = path.join(dir, entry);
                const relativePath = path.relative(root, fullPath);
                // Check ignore patterns
                if (this.shouldIgnore(relativePath)) {
                    continue;
                }
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    this.graph.totalDirectories++;
                    await this.scanDirectory(fullPath, root);
                }
                else {
                    this.graph.totalFiles++;
                    const node = {
                        id: relativePath,
                        path: relativePath,
                        type: 'file',
                        language: this.getLanguage(entry),
                        size: stat.size,
                        dependencies: new Set(),
                        dependents: new Set(),
                        imports: [],
                        exports: [],
                        lastModified: stat.mtimeMs
                    };
                    this.graph.nodes.set(relativePath, node);
                }
            }
        }
        catch (error) {
            console.error(`[WorkspaceGraph] Error scanning directory ${dir}:`, error);
        }
    }
    /**
     * Private: Analyze dependencies between files
     */
    async analyzeDependencies() {
        this.graph.nodes.forEach((node) => {
            try {
                const filePath = path.join(this.graph.root, node.path);
                const content = fs.readFileSync(filePath, 'utf-8');
                // Extract imports (simple regex, not AST)
                const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
                let match;
                while ((match = importRegex.exec(content)) !== null) {
                    let importPath = match[1];
                    // Resolve relative imports
                    if (importPath.startsWith('.')) {
                        const dir = path.dirname(node.path);
                        importPath = path.normalize(path.join(dir, importPath));
                        // Try with extensions
                        const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
                        for (const ext of extensions) {
                            const fullPath = importPath + ext;
                            if (this.graph.nodes.has(fullPath)) {
                                const depNode = this.graph.nodes.get(fullPath);
                                node.dependencies.add(fullPath);
                                depNode.dependents.add(node.path);
                                node.imports.push(fullPath);
                                break;
                            }
                        }
                    }
                }
                // Estimate complexity based on file size
                if (node.size > 10000) {
                    node.complexity = 'high';
                }
                else if (node.size > 3000) {
                    node.complexity = 'medium';
                }
                else {
                    node.complexity = 'low';
                }
            }
            catch (error) {
                // Skip files that can't be read
            }
        });
    }
    /**
     * Private: Find files matching a pattern
     */
    findDirectoryPattern(pattern) {
        const matches = [];
        this.graph.nodes.forEach((node) => {
            if (pattern.test(node.path)) {
                matches.push(node.path);
            }
        });
        return matches;
    }
    /**
     * Private: Check if path should be ignored
     */
    shouldIgnore(relativePath) {
        return this.ignorePatterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(relativePath);
        });
    }
    /**
     * Private: Get file language from extension
     */
    getLanguage(filename) {
        return this.fileExtensionMap.get(path.extname(filename));
    }
    /**
     * Private: Setup file extension map
     */
    setupFileExtensionMap() {
        this.fileExtensionMap.set('.ts', 'typescript');
        this.fileExtensionMap.set('.tsx', 'typescript');
        this.fileExtensionMap.set('.js', 'javascript');
        this.fileExtensionMap.set('.jsx', 'javascript');
        this.fileExtensionMap.set('.py', 'python');
        this.fileExtensionMap.set('.go', 'go');
        this.fileExtensionMap.set('.rs', 'rust');
        this.fileExtensionMap.set('.json', 'json');
        this.fileExtensionMap.set('.yaml', 'yaml');
        this.fileExtensionMap.set('.md', 'markdown');
    }
    /**
     * Cleanup on dispose
     */
    dispose() {
        this.graph.nodes.clear();
        console.log('[WorkspaceGraph] Disposed');
    }
}
exports.WorkspaceGraph = WorkspaceGraph;
/**
 * Initialize global workspace graph
 */
async function initializeGlobalWorkspaceGraph(root) {
    exports.globalWorkspaceGraph = new WorkspaceGraph(root);
    await exports.globalWorkspaceGraph.buildGraph();
    return exports.globalWorkspaceGraph;
}
exports.initializeGlobalWorkspaceGraph = initializeGlobalWorkspaceGraph;
//# sourceMappingURL=workspaceGraph.js.map