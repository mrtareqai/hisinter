import * as fs from 'fs';
import * as path from 'path';

/**
 * Workspace Intelligence System
 * Analyzes project structure, dependencies, and patterns for intelligent assistance
 */

export interface ProjectMetadata {
    name: string;
    type: 'nodejs' | 'python' | 'rust' | 'java' | 'go' | 'unknown';
    frameworks: string[];
    dependencies: Map<string, string>;
    devDependencies: Map<string, string>;
    files: Map<string, FileMetadata>;
    entryPoints: string[];
    structure: DirectoryStructure;
}

export interface FileMetadata {
    path: string;
    size: number;
    language: string;
    imports: string[];
    exports: string[];
    lastModified: number;
}

export interface DirectoryStructure {
    name: string;
    type: 'file' | 'directory';
    children?: DirectoryStructure[];
    fileCount?: number;
}

export class WorkspaceIntelligence {
    private metadata: ProjectMetadata | null = null;
    private codePatterns: Map<string, number> = new Map();
    private fileCache: Map<string, { content: string; timestamp: number }> = new Map();

    async analyzeWorkspace(workspaceRoot: string): Promise<ProjectMetadata> {
        this.metadata = {
            name: path.basename(workspaceRoot),
            type: 'unknown',
            frameworks: [],
            dependencies: new Map(),
            devDependencies: new Map(),
            files: new Map(),
            entryPoints: [],
            structure: await this.buildStructure(workspaceRoot),
        };

        // Detect project type and read package files
        await this.detectProjectType(workspaceRoot);
        
        // Scan files
        await this.scanFiles(workspaceRoot);

        // Detect entry points
        this.detectEntryPoints();

        // Analyze patterns
        this.analyzePatterns();

        return this.metadata;
    }

    private async detectProjectType(workspaceRoot: string): Promise<void> {
        if (!this.metadata) return;

        // Check for package.json
        const pkgPath = path.join(workspaceRoot, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                this.metadata.name = pkg.name || this.metadata.name;
                this.metadata.type = 'nodejs';

                // Parse dependencies
                for (const [dep, version] of Object.entries(pkg.dependencies || {})) {
                    this.metadata.dependencies.set(dep, version as string);
                }
                for (const [dep, version] of Object.entries(pkg.devDependencies || {})) {
                    this.metadata.devDependencies.set(dep, version as string);
                }

                // Detect frameworks
                const allDeps = Array.from(this.metadata.dependencies.keys());
                if (allDeps.some(d => d.includes('react'))) this.metadata.frameworks.push('React');
                if (allDeps.some(d => d.includes('vue'))) this.metadata.frameworks.push('Vue');
                if (allDeps.some(d => d.includes('next'))) this.metadata.frameworks.push('Next.js');
                if (allDeps.some(d => d.includes('angular'))) this.metadata.frameworks.push('Angular');
                if (allDeps.some(d => d.includes('express'))) this.metadata.frameworks.push('Express');
                if (allDeps.some(d => d.includes('nest'))) this.metadata.frameworks.push('NestJS');
            } catch {}
        }

        // Check for Python
        if (fs.existsSync(path.join(workspaceRoot, 'requirements.txt')) || 
            fs.existsSync(path.join(workspaceRoot, 'pyproject.toml'))) {
            this.metadata.type = 'python';
        }

        // Check for Rust
        if (fs.existsSync(path.join(workspaceRoot, 'Cargo.toml'))) {
            this.metadata.type = 'rust';
        }

        // Check for Go
        if (fs.existsSync(path.join(workspaceRoot, 'go.mod'))) {
            this.metadata.type = 'go';
        }

        // Check for Java
        if (fs.existsSync(path.join(workspaceRoot, 'pom.xml')) || 
            fs.existsSync(path.join(workspaceRoot, 'build.gradle'))) {
            this.metadata.type = 'java';
        }
    }

    private async scanFiles(workspaceRoot: string, maxFiles = 5000): Promise<void> {
        if (!this.metadata) return;

        const scan = (dir: string, depth = 0): void => {
            if (this.metadata!.files.size >= maxFiles || depth > 15) return;

            try {
                const entries = fs.readdirSync(dir);
                for (const entry of entries) {
                    if (entry.startsWith('.')) continue;
                    if (['node_modules', 'dist', 'build', '__pycache__', 'target'].includes(entry)) continue;

                    const fullPath = path.join(dir, entry);
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory()) {
                        scan(fullPath, depth + 1);
                    } else {
                        const relativePath = path.relative(workspaceRoot, fullPath);
                        const language = this.getLanguage(fullPath);
                        
                        this.metadata!.files.set(relativePath, {
                            path: relativePath,
                            size: stat.size,
                            language,
                            imports: [],
                            exports: [],
                            lastModified: stat.mtime.getTime(),
                        });
                    }
                }
            } catch {}
        };

        scan(workspaceRoot);
    }

    private detectEntryPoints(): void {
        if (!this.metadata) return;

        const candidates = ['main.ts', 'main.js', 'index.ts', 'index.js', 'app.ts', 'app.js', 'src/index.ts', 'src/main.ts'];
        
        for (const candidate of candidates) {
            if (this.metadata.files.has(candidate)) {
                this.metadata.entryPoints.push(candidate);
            }
        }
    }

    private analyzePatterns(): void {
        if (!this.metadata) return;

        for (const file of this.metadata.files.values()) {
            const pattern = `${file.language}-file`;
            this.codePatterns.set(pattern, (this.codePatterns.get(pattern) || 0) + 1);
        }
    }

    private async buildStructure(dir: string, depth = 0): Promise<DirectoryStructure> {
        const name = path.basename(dir);
        const stat = fs.statSync(dir);

        if (stat.isFile()) {
            return { name, type: 'file' };
        }

        const children: DirectoryStructure[] = [];
        let fileCount = 0;

        try {
            const entries = fs.readdirSync(dir);
            for (const entry of entries) {
                if (entry.startsWith('.') || depth > 3) continue;
                if (['node_modules', 'dist', 'build'].includes(entry)) continue;

                const fullPath = path.join(dir, entry);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    children.push(await this.buildStructure(fullPath, depth + 1));
                } else {
                    children.push({ name: entry, type: 'file' });
                    fileCount++;
                }
            }
        } catch {}

        return {
            name,
            type: 'directory',
            children: children.length > 0 ? children : undefined,
            fileCount,
        };
    }

    private getLanguage(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const langMap: Record<string, string> = {
            '.ts': 'typescript',
            '.tsx': 'tsx',
            '.js': 'javascript',
            '.jsx': 'jsx',
            '.py': 'python',
            '.rs': 'rust',
            '.go': 'go',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'header',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown',
            '.sql': 'sql',
        };
        return langMap[ext] || 'unknown';
    }

    getMetadata(): ProjectMetadata | null {
        return this.metadata;
    }

    getFilesByLanguage(language: string): FileMetadata[] {
        if (!this.metadata) return [];
        return Array.from(this.metadata.files.values()).filter(f => f.language === language);
    }

    getCommonPatterns(): string[] {
        return Array.from(this.codePatterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([pattern]) => pattern);
    }

    getFilesSummary(): { total: number; byLanguage: Record<string, number> } {
        if (!this.metadata) {
            return { total: 0, byLanguage: {} };
        }

        const byLanguage: Record<string, number> = {};
        for (const file of this.metadata.files.values()) {
            byLanguage[file.language] = (byLanguage[file.language] || 0) + 1;
        }

        return {
            total: this.metadata.files.size,
            byLanguage,
        };
    }
}

export const globalWorkspaceIntelligence = new WorkspaceIntelligence();
