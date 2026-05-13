/**
 * ProjectGenerator
 * Universal project factory supporting all languages and frameworks
 */
export declare class ProjectGenerator {
    private projectPath;
    private language;
    private framework;
    private projectType;
    private templates;
    constructor(projectPath: string);
    /**
     * Detect language from intent
     */
    detectLanguage(intent: string): string;
    /**
     * Detect framework from intent
     */
    detectFramework(intent: string, language: string): string;
    /**
     * Generate complete project structure
     */
    generateProject(projectName: string, intent: string): Promise<{
        success: boolean;
        projectPath: string;
        filesCreated: string[];
        message: string;
    }>;
    private generatePackageJson;
    private generateHTMLIndex;
    private generateJSEntry;
    private generateReactComponent;
    private generateReactEntry;
    private generateNextPage;
    private generateNextLayout;
    private generateTSConfig;
    private generateNextGlobals;
    private generateProjectData;
    private generateFastAPIMain;
    private generateDjangoManage;
    private generateFlaskApp;
    private generateGinServer;
    private generateEchoServer;
    private generateActixMain;
    private generateCargoToml;
    private generateStandaloneHTML;
    private generateStandaloneCSS;
    private generateStandaloneJS;
    private generateExpressServer;
    private generateTodoHTML;
    private generateTodoCSS;
    private generateTodoJS;
}
export default ProjectGenerator;
