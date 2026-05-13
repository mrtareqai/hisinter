"use strict";
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
exports.createContextBrain = exports.ContextBrain = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ContextBrain {
    projectRoot = '';
    currentContext = null;
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
    }
    async analyzeProject() {
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
    updateContext(updates) {
        if (this.currentContext) {
            this.currentContext = { ...this.currentContext, ...updates };
        }
    }
    getContext() {
        return this.currentContext;
    }
    async getSmartContext(intent, limit = 5) {
        if (!this.currentContext) {
            await this.analyzeProject();
        }
        const relevant = [];
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
    detectFramework(packageJson) {
        if (!packageJson)
            return 'unknown';
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps['react'])
            return 'react';
        if (deps['vue'])
            return 'vue';
        if (deps['angular'])
            return 'angular';
        if (deps['svelte'])
            return 'svelte';
        if (deps['next'])
            return 'next.js';
        if (deps['nuxt'])
            return 'nuxt';
        if (deps['astro'])
            return 'astro';
        if (deps['remix'])
            return 'remix';
        return 'custom';
    }
    detectPackageManager() {
        // Check for lock files
        if (fs.existsSync(path.join(this.projectRoot, 'pnpm-lock.yaml')))
            return 'pnpm';
        if (fs.existsSync(path.join(this.projectRoot, 'yarn.lock')))
            return 'yarn';
        if (fs.existsSync(path.join(this.projectRoot, 'bun.lockb')))
            return 'bun';
        return 'npm';
    }
    async detectCodeStyle() {
        // Check for prettier or eslint config
        let style = {
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
                if (prettier.useTabs)
                    style.indentation = 'tabs';
                if (prettier.tabWidth)
                    style.indentSize = prettier.tabWidth;
                if (prettier.singleQuote === false)
                    style.quotes = 'double';
                if (prettier.semi === false)
                    style.semicolons = false;
                if (prettier.trailingComma)
                    style.trailingComma = prettier.trailingComma;
                if (prettier.arrowParens)
                    style.arrowParens = prettier.arrowParens;
            }
            catch (e) {
                // Ignore parse errors
            }
        }
        return style;
    }
    buildFileTree(dir, maxDepth, currentDepth = 0) {
        if (currentDepth >= maxDepth)
            return [];
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            const ignored = ['.git', 'node_modules', '.next', 'dist', 'build', '.env'];
            return entries
                .filter((entry) => !ignored.includes(entry.name))
                .map((entry) => {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.relative(this.projectRoot, fullPath);
                const node = {
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
                    }
                    catch (e) {
                        // Ignore size errors
                    }
                }
                return node;
            });
        }
        catch (e) {
            return [];
        }
    }
    loadPackageJson(filePath) {
        if (!fs.existsSync(filePath))
            return null;
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
        catch (e) {
            return null;
        }
    }
    extractPatterns() {
        // Extract common patterns from recent files
        const patterns = [];
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
        }
        catch (e) {
            // Ignore errors
        }
        return patterns.slice(0, 5);
    }
}
exports.ContextBrain = ContextBrain;
const createContextBrain = (projectRoot = process.cwd()) => {
    return new ContextBrain(projectRoot);
};
exports.createContextBrain = createContextBrain;
//# sourceMappingURL=contextBrain.js.map