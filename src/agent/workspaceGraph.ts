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

import * as fs from 'fs';
import * as path from 'path';

/**
 * Single node in the workspace graph
 */
export interface WorkspaceNode {
  id: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  size: number;
  dependencies: Set<string>;
  dependents: Set<string>;
  imports: string[];
  exports: string[];
  lastModified: number;
  complexity?: 'low' | 'medium' | 'high';
}

/**
 * Architecture pattern detected in workspace
 */
export interface ArchitecturePattern {
  id: string;
  name: string;
  description: string;
  files: string[];
  confidence: number;
}

/**
 * Workspace dependency graph
 */
export interface WorkspaceGraph {
  root: string;
  nodes: Map<string, WorkspaceNode>;
  patterns: ArchitecturePattern[];
  timestamp: number;
  totalFiles: number;
  totalDirectories: number;
}

/**
 * Impact analysis result
 */
export interface ImpactAnalysis {
  changedFiles: string[];
  directlyAffected: string[];
  indirectlyAffected: string[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedScope: number;
}

/**
 * File context for smart selection
 */
export interface FileContext {
  path: string;
  relevanceScore: number;
  reason: string;
  distance: number;
}

export class WorkspaceGraph {
  private graph: WorkspaceGraph;
  private fileExtensionMap = new Map<string, string>();
  private ignorePatterns = [
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

  constructor(root: string) {
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
  async buildGraph(): Promise<WorkspaceGraph> {
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
    console.log(
      `[WorkspaceGraph] Graph built in ${duration.toFixed(0)}ms ` +
      `(${this.graph.totalFiles} files, ${this.graph.totalDirectories} dirs)`
    );
    
    return this.graph;
  }

  /**
   * Find all files that depend on a given file
   */
  findDependents(filePath: string): string[] {
    const node = this.graph.nodes.get(filePath);
    if (!node) return [];
    return Array.from(node.dependents);
  }

  /**
   * Find all files that a file depends on
   */
  findDependencies(filePath: string): string[] {
    const node = this.graph.nodes.get(filePath);
    if (!node) return [];
    return Array.from(node.dependencies);
  }

  /**
   * Analyze impact of changes to specific files
   */
  analyzeImpact(changedFiles: string[]): ImpactAnalysis {
    const affected = new Set<string>();
    const indirect = new Set<string>();
    
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
      if (affected.has(f)) indirect.delete(f);
    });

    const estimatedScope = changedFiles.length + affected.size + indirect.size;
    const riskLevel: 'low' | 'medium' | 'high' = 
      estimatedScope > this.graph.totalFiles * 0.3 ? 'high' :
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
  getContextForFile(filePath: string, depth: number = 2): FileContext[] {
    const node = this.graph.nodes.get(filePath);
    if (!node) return [];

    const context: FileContext[] = [];
    const visited = new Set<string>();
    visited.add(filePath);

    // Helper for recursive exploration
    const explore = (currentPath: string, currentDepth: number, score: number) => {
      if (currentDepth > depth) return;
      const currentNode = this.graph.nodes.get(currentPath);
      if (!currentNode) return;

      const neighbors = [
        ...Array.from(currentNode.dependencies).map(d => ({ path: d, reason: 'Dependency', score: score })),
        ...Array.from(currentNode.dependents).map(d => ({ path: d, reason: 'Dependent', score: score * 0.9 }))
      ];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.path)) {
          visited.add(neighbor.path);
          context.push({
            path: neighbor.path,
            relevanceScore: neighbor.score,
            reason: `${neighbor.reason} (distance ${currentDepth})`,
            distance: currentDepth
          });
          explore(neighbor.path, currentDepth + 1, neighbor.score * 0.7);
        }
      }
    };

    explore(filePath, 1, 0.9);

    // Add same-directory files (lower priority)
    const dir = path.dirname(filePath);
    this.graph.nodes.forEach((n, nodePath) => {
      if (path.dirname(nodePath) === dir && !visited.has(nodePath)) {
        context.push({
          path: nodePath,
          relevanceScore: 0.4,
          reason: 'Same directory',
          distance: 1
        });
        visited.add(nodePath);
      }
    });

    // Architecture-aware: find related files by pattern match (e.g. component -> style)
    const fileName = path.basename(filePath, path.extname(filePath));
    this.graph.nodes.forEach((n, nodePath) => {
      if (!visited.has(nodePath) && path.basename(nodePath).includes(fileName)) {
        context.push({
          path: nodePath,
          relevanceScore: 0.7,
          reason: 'Naming pattern match (architectural link)',
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
  detectPatterns(): void {
    const patterns: ArchitecturePattern[] = [];

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
  getPatterns(): ArchitecturePattern[] {
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
      filesByType: {} as Record<string, number>,
      deepestPath: 0,
      mostDependencies: { file: '', count: 0 },
      highestComplexity: [] as string[]
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
  private async scanDirectory(dir: string, root: string): Promise<void> {
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
        } else {
          this.graph.totalFiles++;
          
          const node: WorkspaceNode = {
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
    } catch (error) {
      console.error(`[WorkspaceGraph] Error scanning directory ${dir}:`, error);
    }
  }

  /**
   * Private: Analyze dependencies between files
   */
  private async analyzeDependencies(): Promise<void> {
    this.graph.nodes.forEach((node) => {
      try {
        const filePath = path.join(this.graph.root, node.path);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract imports (simple regex, not AST)
        const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
          let importPath = match[1];

          // Resolve aliases (common in modern projects)
          if (importPath.startsWith('@/')) {
            importPath = path.join('src', importPath.substring(2));
          }

          // Resolve relative imports
          if (importPath.startsWith('.') || (importPath.includes('/') && !importPath.includes('node_modules') && !this.isExternalPackage(importPath))) {
            const dir = path.dirname(node.path);
            importPath = path.normalize(path.join(dir, importPath));
            
            // Try with extensions
            const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
            for (const ext of extensions) {
              const fullPath = importPath + ext;
              if (this.graph.nodes.has(fullPath)) {
                const depNode = this.graph.nodes.get(fullPath)!;
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
        } else if (node.size > 3000) {
          node.complexity = 'medium';
        } else {
          node.complexity = 'low';
        }

      } catch (error) {
        // Skip files that can't be read
      }
    });
  }

  /**
   * Private: Find files matching a pattern
   */
  private findDirectoryPattern(pattern: RegExp): string[] {
    const matches: string[] = [];
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
  private shouldIgnore(relativePath: string): boolean {
    return this.ignorePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(relativePath);
    });
  }

  /**
   * Private: Check if a path is likely an external package
   */
  private isExternalPackage(importPath: string): boolean {
    const commonPackages = ['react', 'vue', 'vscode', 'path', 'fs', 'http', 'os', 'crypto'];
    const firstPart = importPath.split('/')[0];
    return commonPackages.includes(firstPart) || (!importPath.startsWith('.') && !importPath.startsWith('@/'));
  }

  /**
   * Private: Get file language from extension
   */
  private getLanguage(filename: string): string | undefined {
    return this.fileExtensionMap.get(path.extname(filename));
  }

  /**
   * Private: Setup file extension map
   */
  private setupFileExtensionMap(): void {
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
  dispose(): void {
    this.graph.nodes.clear();
    console.log('[WorkspaceGraph] Disposed');
  }
}

// Global instance
export let globalWorkspaceGraph: WorkspaceGraph;

/**
 * Initialize global workspace graph
 */
export async function initializeGlobalWorkspaceGraph(root: string): Promise<WorkspaceGraph> {
  globalWorkspaceGraph = new WorkspaceGraph(root);
  await globalWorkspaceGraph.buildGraph();
  return globalWorkspaceGraph;
}
