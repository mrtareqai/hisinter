import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext, FileTreeNode, CodeStyle } from '../../types/agent';

export class ContextBrain {
  private projectRoot: string = '';
  private currentContext: ProjectContext | null = null;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async analyzeProject(): Promise<ProjectContext> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = this.loadPackageJson(packageJsonPath);

    const framework = this.detectFramework(packageJson);
    const structure = this.buildFileTree(this.projectRoot, 3);
    const userStyle = await this.detectCodeStyle();
    const recentPatterns = this.extractPatterns();

    this.currentContext = {
      root: this.projectRoot,
      name: packageJson?.name || 'unknown-project',
      framework,
      language: 'typescript',
      packageManager: this.detectPackageManager(),
      structure,
      dependencies: packageJson?.dependencies || {},
      scripts: packageJson?.scripts || {},
      userStyle,
      recentPatterns,
      successfulPatterns: [],
    };

    return this.currentContext;
  }

  updateContext(updates: Partial<ProjectContext>): void {
    if (this.currentContext) {
      this.currentContext = { ...this.currentContext, ...updates };
    }
  }

  getContext(): ProjectContext | null {
    return this.currentContext;
  }

  async getSmartContext(intent: string, limit: number = 5): Promise<string> {
    if (!this.currentContext) {
      await this.analyzeProject();
    }

    const relevant: string[] = [];

    // Add framework context
    if (this.currentContext?.framework) {
      relevant.push(`Framework: ${this.currentContext.framework}`);
    }

    // Add dependency context
    if (this.currentContext?.dependencies) {
      const depKeys = Object.keys(this.currentContext.dependencies).slice(0, 5);
      relevant.push(`Key dependencies: ${depKeys.join(', ')}`);
    }

    // Add style context
    if (this.currentContext?.userStyle) {
      relevant.push(`Code style: ${this.currentContext.userStyle.indentation}-based indentation`);
    }

    // Add pattern context
    if (this.currentContext?.recentPatterns) {
      relevant.push(`Recent patterns: ${this.currentContext.recentPatterns.slice(0, 3).join(', ')}`);
    }

    return relevant.slice(0, limit).join('\n');
  }

  private detectFramework(packageJson: any): string {
    if (!packageJson) return 'unknown';

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps['react']) return 'react';
    if (deps['vue']) return 'vue';
    if (deps['angular']) return 'angular';
    if (deps['svelte']) return 'svelte';
    if (deps['next']) return 'next.js';
    if (deps['nuxt']) return 'nuxt';
    if (deps['astro']) return 'astro';
    if (deps['remix']) return 'remix';

    return 'custom';
  }

  private detectPackageManager(): 'npm' | 'yarn' | 'pnpm' | 'bun' {
    // Check for lock files
    if (fs.existsSync(path.join(this.projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(this.projectRoot, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(this.projectRoot, 'bun.lockb'))) return 'bun';

    return 'npm';
  }

  private async detectCodeStyle(): Promise<CodeStyle> {
    // Check for prettier or eslint config
    let style: CodeStyle = {
      indentation: 'spaces',
      indentSize: 2,
      quotes: 'single',
      semicolons: true,
      trailingComma: 'es5',
      arrowParens: 'always',
      jsxSingleQuote: false,
    };

    // Try to read prettier config
    const prettierPath = path.join(this.projectRoot, '.prettierrc');
    if (fs.existsSync(prettierPath)) {
      try {
        const prettier = JSON.parse(fs.readFileSync(prettierPath, 'utf-8'));
        if (prettier.useTabs) style.indentation = 'tabs';
        if (prettier.tabWidth) style.indentSize = prettier.tabWidth;
        if (prettier.singleQuote === false) style.quotes = 'double';
        if (prettier.semi === false) style.semicolons = false;
        if (prettier.trailingComma) style.trailingComma = prettier.trailingComma;
        if (prettier.arrowParens) style.arrowParens = prettier.arrowParens;
      } catch (e) {
        // Ignore parse errors
      }
    }

    return style;
  }

  private buildFileTree(dir: string, maxDepth: number, currentDepth: number = 0): FileTreeNode[] {
    if (currentDepth >= maxDepth) return [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const ignored = ['.git', 'node_modules', '.next', 'dist', 'build', '.env'];

      return entries
        .filter((entry) => !ignored.includes(entry.name))
        .map((entry) => {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(this.projectRoot, fullPath);

          const node: FileTreeNode = {
            name: entry.name,
            path: relativePath,
            type: entry.isDirectory() ? 'folder' : 'file',
          };

          if (entry.isDirectory() && currentDepth < maxDepth - 1) {
            node.children = this.buildFileTree(fullPath, maxDepth, currentDepth + 1);
          }

          if (entry.isFile()) {
            try {
              const stats = fs.statSync(fullPath);
              node.size = stats.size;
            } catch (e) {
              // Ignore size errors
            }
          }

          return node;
        });
    } catch (e) {
      return [];
    }
  }

  private loadPackageJson(filePath: string): any {
    if (!fs.existsSync(filePath)) return null;

    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return null;
    }
  }

  private extractPatterns(): string[] {
    // Extract common patterns from recent files
    const patterns: string[] = [];

    // Common pattern detection
    try {
      const srcPath = path.join(this.projectRoot, 'src');
      if (fs.existsSync(srcPath)) {
        // Look for common component patterns
        if (fs.existsSync(path.join(srcPath, 'components'))) {
          patterns.push('component-based architecture');
        }

        if (fs.existsSync(path.join(srcPath, 'pages'))) {
          patterns.push('pages directory pattern');
        }

        if (fs.existsSync(path.join(srcPath, 'hooks'))) {
          patterns.push('custom hooks pattern');
        }

        if (fs.existsSync(path.join(srcPath, 'utils'))) {
          patterns.push('utility functions pattern');
        }
      }
    } catch (e) {
      // Ignore errors
    }

    return patterns.slice(0, 5);
  }
}

export const createContextBrain = (projectRoot: string = process.cwd()): ContextBrain => {
  return new ContextBrain(projectRoot);
};
