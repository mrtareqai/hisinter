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
export declare class ProjectGenerationEngine {
    private projectRoot;
    private templates;
    constructor(projectRoot: string);
    private initializeTemplates;
    /**
     * Generate complete project from intent
     */
    generateProject(request: GenerationRequest): Promise<{
        success: boolean;
        projectPath: string;
        generatedFiles: string[];
        message: string;
    }>;
    /**
     * Get available templates by language
     */
    getTemplatesByLanguage(language: string): ProjectTemplate[];
    /**
     * List all available templates
     */
    listAllTemplates(): ProjectTemplate[];
}
export default ProjectGenerationEngine;
