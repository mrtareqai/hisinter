/**
 * LanguageAdapters
 * Multi-language support with framework-specific adaptations
 */
export declare class LanguageAdapters {
    static readonly SUPPORTED_LANGUAGES: string[];
    static readonly LANGUAGE_TEMPLATES: Record<string, {
        name: string;
        extension: string;
        frameworks: string[];
        setupCommand: string;
        runCommand: string;
    }>;
    /**
     * Get language config
     */
    static getLanguageConfig(language: string): (typeof LanguageAdapters.LANGUAGE_TEMPLATES)[keyof typeof LanguageAdapters.LANGUAGE_TEMPLATES];
    /**
     * Get appropriate package manager for language
     */
    static getPackageManager(language: string): string;
    /**
     * Get build system for language
     */
    static getBuildSystem(language: string): string;
    /**
     * Get default config file for language
     */
    static getConfigFile(language: string): string;
    /**
     * Generate language-specific dependencies
     */
    static generateDependencies(language: string, framework: string): string[];
    /**
     * Check if language is supported
     */
    static isSupported(language: string): boolean;
    /**
     * Get all supported frameworks for language
     */
    static getFrameworks(language: string): string[];
    /**
     * Get setup instructions
     */
    static getSetupInstructions(language: string): {
        install: string;
        dev: string;
        build: string;
    };
}
export default LanguageAdapters;
