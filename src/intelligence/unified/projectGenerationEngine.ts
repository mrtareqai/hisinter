import fs from 'fs';
import path from 'path';

export interface ProjectTemplate {
  name: string;
  language: string;
  framework?: string;
  structure: ProjectStructure[];
  dependencies: string[];
  scripts: Record<string, string>;
  description: string;
}

export interface ProjectStructure {
  path: string;
  type: 'directory' | 'file';
  content?: string;
  template?: boolean;
}

export interface GenerationRequest {
  projectName: string;
  projectType: string;
  language: string;
  framework?: string;
  features: string[];
  customizations?: Record<string, unknown>;
}

/**
 * ProjectGenerationEngine - Generates complete project structures from intent
 * Supports: Python, JavaScript, TypeScript, React, Node.js, Go, Rust, HTML, CSS, etc.
 */
export class ProjectGenerationEngine {
  private projectRoot: string;
  private templates: Map<string, ProjectTemplate> = new Map();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Python templates
    this.templates.set('python-cli', {
      name: 'Python CLI Application',
      language: 'python',
      structure: [
        { path: 'src/__init__.py', type: 'file', content: '' },
        {
          path: 'src/main.py',
          type: 'file',
          content: 'def main():\n    print("Hello from CLI")\n\nif __name__ == "__main__":\n    main()',
        },
        { path: 'tests/__init__.py', type: 'file', content: '' },
        {
          path: 'tests/test_main.py',
          type: 'file',
          content: 'import pytest\nfrom src.main import main\n\ndef test_main():\n    pass',
        },
        {
          path: 'requirements.txt',
          type: 'file',
          content: '# Project dependencies',
        },
        { path: 'README.md', type: 'file', content: '# Project Name\n' },
      ],
      dependencies: ['pytest', 'black'],
      scripts: {
        'dev:run': 'python src/main.py',
        'test': 'pytest tests/',
        'format': 'black src/',
      },
      description: 'Python CLI application',
    });

    // JavaScript/Node templates
    this.templates.set('node-server', {
      name: 'Node.js Express Server',
      language: 'javascript',
      framework: 'express',
      structure: [
        {
          path: 'src/index.js',
          type: 'file',
          content:
            'const express = require("express");\nconst app = express();\n\napp.get("/", (req, res) => res.json({message: "OK"}));\n\nconst PORT = 3000;\napp.listen(PORT, () => console.log(`Server on port ${PORT}`));',
        },
        { path: 'src/routes/index.js', type: 'file', content: 'module.exports = {};\n' },
        {
          path: 'package.json',
          type: 'file',
          template: true,
          content: '{}',
        },
        { path: '.env.example', type: 'file', content: 'PORT=3000\n' },
      ],
      dependencies: ['express', 'dotenv'],
      scripts: {
        'dev:start': 'node src/index.js',
        'dev:watch': 'nodemon src/index.js',
      },
      description: 'Node.js Express server',
    });

    // React templates
    this.templates.set('react-app', {
      name: 'React Application',
      language: 'javascript',
      framework: 'react',
      structure: [
        {
          path: 'src/index.jsx',
          type: 'file',
          content:
            'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);',
        },
        {
          path: 'src/App.jsx',
          type: 'file',
          content: 'export default function App() {\n  return <div>Hello React</div>;\n}',
        },
        {
          path: 'src/components/.gitkeep',
          type: 'file',
          content: '',
        },
        { path: 'public/index.html', type: 'file', template: true },
        { path: 'package.json', type: 'file', template: true },
      ],
      dependencies: ['react', 'react-dom'],
      scripts: {
        'dev:start': 'vite',
        'dev:build': 'vite build',
      },
      description: 'React application with Vite',
    });

    // TypeScript templates
    this.templates.set('typescript-lib', {
      name: 'TypeScript Library',
      language: 'typescript',
      structure: [
        { path: 'src/index.ts', type: 'file', content: 'export const hello = () => "Hello";\n' },
        { path: 'src/types/index.ts', type: 'file', content: '// Type definitions\n' },
        {
          path: 'tests/index.test.ts',
          type: 'file',
          content: 'import { hello } from "../src/index";\n\ntest("hello works", () => {\n  expect(hello()).toBe("Hello");\n});',
        },
        { path: 'tsconfig.json', type: 'file', template: true },
        { path: 'package.json', type: 'file', template: true },
      ],
      dependencies: ['typescript', 'jest', '@types/jest'],
      scripts: {
        'build': 'tsc',
        'test': 'jest',
        'dev:watch': 'tsc --watch',
      },
      description: 'TypeScript library project',
    });

    // Go templates
    this.templates.set('go-cli', {
      name: 'Go CLI Application',
      language: 'go',
      structure: [
        {
          path: 'main.go',
          type: 'file',
          content:
            'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go")\n}',
        },
        {
          path: 'go.mod',
          type: 'file',
          content: 'module cli\n\ngo 1.21\n',
        },
      ],
      dependencies: [],
      scripts: {
        'run': 'go run main.go',
        'build': 'go build -o bin/cli main.go',
        'test': 'go test ./...',
      },
      description: 'Go CLI application',
    });

    // Rust templates
    this.templates.set('rust-cli', {
      name: 'Rust CLI Application',
      language: 'rust',
      structure: [
        {
          path: 'Cargo.toml',
          type: 'file',
          template: true,
          content: '[package]\nname = "cli"\nversion = "0.1.0"\nedition = "2021"\n',
        },
        {
          path: 'src/main.rs',
          type: 'file',
          content: 'fn main() {\n    println!("Hello from Rust");\n}',
        },
      ],
      dependencies: [],
      scripts: {
        'run': 'cargo run',
        'build': 'cargo build --release',
        'test': 'cargo test',
      },
      description: 'Rust CLI application',
    });

    // HTML/CSS templates
    this.templates.set('html-static', {
      name: 'Static HTML Website',
      language: 'html',
      structure: [
        {
          path: 'index.html',
          type: 'file',
          content:
            '<!DOCTYPE html>\n<html>\n<head><title>Hello</title></head>\n<body><h1>Welcome</h1></body>\n</html>',
        },
        { path: 'css/style.css', type: 'file', content: 'body { font-family: sans-serif; }\n' },
        { path: 'js/script.js', type: 'file', content: 'console.log("Hello");\n' },
      ],
      dependencies: [],
      scripts: {
        'serve': 'python -m http.server 8000',
      },
      description: 'Static HTML website',
    });
  }

  /**
   * Generate complete project from intent
   */
  async generateProject(request: GenerationRequest): Promise<{
    success: boolean;
    projectPath: string;
    generatedFiles: string[];
    message: string;
  }> {
    const generatedFiles: string[] = [];

    try {
      const templateKey = `${request.language}-${request.projectType}`;
      const template = this.templates.get(templateKey);

      if (!template) {
        return {
          success: false,
          projectPath: '',
          generatedFiles: [],
          message: `Template not found: ${templateKey}. Available: ${Array.from(this.templates.keys()).join(', ')}`,
        };
      }

      // Create project directory
      const projectPath = path.join(this.projectRoot, request.projectName);
      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
      }

      // Generate structure
      for (const item of template.structure) {
        const fullPath = path.join(projectPath, item.path);

        if (item.type === 'directory') {
          fs.mkdirSync(fullPath, { recursive: true });
        } else {
          // Create parent directories
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // Write file
          let content = item.content || '';
          if (item.template && item.path.includes('package.json')) {
            content = JSON.stringify(
              {
                name: request.projectName,
                version: '1.0.0',
                description: request.projectType,
                scripts: template.scripts,
                dependencies:
                  template.dependencies.length > 0
                    ? Object.fromEntries(
                        template.dependencies.map((dep) => [dep, '^1.0.0'])
                      )
                    : undefined,
              },
              null,
              2
            );
          }

          fs.writeFileSync(fullPath, content);
          generatedFiles.push(item.path);
        }
      }

      return {
        success: true,
        projectPath,
        generatedFiles,
        message: `Project "${request.projectName}" generated successfully with ${generatedFiles.length} files`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        projectPath: '',
        generatedFiles,
        message: `Generation failed: ${message}`,
      };
    }
  }

  /**
   * Get available templates by language
   */
  getTemplatesByLanguage(language: string): ProjectTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.language === language
    );
  }

  /**
   * List all available templates
   */
  listAllTemplates(): ProjectTemplate[] {
    return Array.from(this.templates.values());
  }
}

export default ProjectGenerationEngine;
