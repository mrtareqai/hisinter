export interface BootstrapConfig {
    projectType: string;
    frameworkStack: string[];
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
    features: string[];
    targetEnvironment: 'development' | 'production' | 'staging';
}
export interface BootstrapPlan {
    config: BootstrapConfig;
    steps: Array<{
        order: number;
        action: string;
        description: string;
        timeEstimate: number;
        dependencies: number[];
    }>;
    estimatedTotalTime: number;
    confidence: number;
}
export declare class BootstrapIntelligence {
    private defaultStacks;
    private defaultFeatures;
    inferConfiguration(userGoal: string): BootstrapConfig;
    private inferProjectType;
    private inferPackageManager;
    generateBootstrapPlan(config: BootstrapConfig): BootstrapPlan;
    autoCompleteConfiguration(partial: Partial<BootstrapConfig>): BootstrapConfig;
    getSmartDefaults(): BootstrapConfig;
    getProjectTypeRecommendations(userGoal: string): {
        recommendedType: string;
        alternatives: string[];
        reasoning: string;
    };
}
export default BootstrapIntelligence;
