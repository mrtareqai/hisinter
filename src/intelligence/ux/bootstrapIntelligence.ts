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
    timeEstimate: number; // ms
    dependencies: number[];
  }>;
  estimatedTotalTime: number;
  confidence: number;
}

export class BootstrapIntelligence {
  private defaultStacks: Record<string, string[]> = {
    'web-app': ['react', 'next.js', 'tailwind', 'typescript'],
    'api-server': ['node.js', 'express', 'postgresql', 'typescript'],
    'fullstack': ['next.js', 'postgresql', 'tailwind', 'typescript'],
    'cli-tool': ['node.js', 'commander', 'typescript'],
    'library': ['rollup', 'typescript', 'jest'],
  };

  private defaultFeatures: Record<string, string[]> = {
    'web-app': ['routing', 'styling', 'state-management', 'api-integration'],
    'api-server': ['routing', 'database', 'authentication', 'validation'],
    'fullstack': ['routing', 'database', 'authentication', 'styling'],
  };

  public inferConfiguration(userGoal: string): BootstrapConfig {
    const projectType = this.inferProjectType(userGoal);
    const frameworkStack = this.defaultStacks[projectType] || this.defaultStacks['web-app'];
    const packageManager = this.inferPackageManager();
    const features = this.defaultFeatures[projectType] || [];

    return {
      projectType,
      frameworkStack,
      packageManager,
      features,
      targetEnvironment: 'development',
    };
  }

  private inferProjectType(goal: string): string {
    const goalLower = goal.toLowerCase();

    if (goalLower.includes('api') || goalLower.includes('server')) {
      return 'api-server';
    }
    if (goalLower.includes('fullstack') || goalLower.includes('full-stack')) {
      return 'fullstack';
    }
    if (goalLower.includes('cli') || goalLower.includes('command')) {
      return 'cli-tool';
    }
    if (goalLower.includes('library') || goalLower.includes('package')) {
      return 'library';
    }

    return 'web-app';
  }

  private inferPackageManager(): 'npm' | 'yarn' | 'pnpm' | 'bun' {
    // Default to pnpm for modern projects
    return 'pnpm';
  }

  public generateBootstrapPlan(config: BootstrapConfig): BootstrapPlan {
    const steps: BootstrapPlan['steps'] = [];
    let currentOrder = 1;

    // Step 1: Initialize project
    steps.push({
      order: currentOrder++,
      action: 'init-project',
      description: `Initialize ${config.projectType} project with ${config.packageManager}`,
      timeEstimate: 5000,
      dependencies: [],
    });

    // Step 2: Install base dependencies
    steps.push({
      order: currentOrder++,
      action: 'install-base-deps',
      description: `Install base dependencies: ${config.frameworkStack.slice(0, 2).join(', ')}`,
      timeEstimate: 30000,
      dependencies: [1],
    });

    // Step 3: Install additional dependencies
    if (config.frameworkStack.length > 2) {
      steps.push({
        order: currentOrder++,
        action: 'install-additional-deps',
        description: `Install additional dependencies: ${config.frameworkStack.slice(2).join(', ')}`,
        timeEstimate: 20000,
        dependencies: [2],
      });
    }

    // Step 4: Setup configuration files
    steps.push({
      order: currentOrder++,
      action: 'setup-config',
      description: `Setup configuration files (tsconfig, eslint, prettier)`,
      timeEstimate: 8000,
      dependencies: [2],
    });

    // Step 5: Create project structure
    steps.push({
      order: currentOrder++,
      action: 'create-structure',
      description: `Create project directory structure and files`,
      timeEstimate: 5000,
      dependencies: [4],
    });

    // Step 6: Setup features
    config.features.forEach((feature) => {
      steps.push({
        order: currentOrder++,
        action: `setup-${feature}`,
        description: `Setup ${feature} feature`,
        timeEstimate: 10000,
        dependencies: [5],
      });
    });

    // Step 7: Verification
    steps.push({
      order: currentOrder++,
      action: 'verify-setup',
      description: `Verify project setup and run build test`,
      timeEstimate: 15000,
      dependencies: [currentOrder - 2],
    });

    const estimatedTotalTime = steps.reduce((sum, step) => sum + step.timeEstimate, 0);
    const confidence = 0.95; // High confidence in bootstrap process

    return {
      config,
      steps,
      estimatedTotalTime,
      confidence,
    };
  }

  public autoCompleteConfiguration(
    partial: Partial<BootstrapConfig>
  ): BootstrapConfig {
    const projectType = partial.projectType || 'web-app';
    const frameworkStack = partial.frameworkStack || this.defaultStacks[projectType];
    const packageManager = partial.packageManager || 'pnpm';
    const features = partial.features || this.defaultFeatures[projectType] || [];
    const targetEnvironment = partial.targetEnvironment || 'development';

    return {
      projectType,
      frameworkStack,
      packageManager,
      features,
      targetEnvironment,
    };
  }

  public getSmartDefaults(): BootstrapConfig {
    return {
      projectType: 'web-app',
      frameworkStack: ['next.js', 'react', 'tailwind', 'typescript'],
      packageManager: 'pnpm',
      features: ['routing', 'styling', 'authentication'],
      targetEnvironment: 'development',
    };
  }

  public getProjectTypeRecommendations(
    userGoal: string
  ): {
    recommendedType: string;
    alternatives: string[];
    reasoning: string;
  } {
    const recommended = this.inferProjectType(userGoal);
    const types = Object.keys(this.defaultStacks);
    const alternatives = types.filter((t) => t !== recommended).slice(0, 2);

    return {
      recommendedType: recommended,
      alternatives,
      reasoning: `Based on "${userGoal}", ${recommended} is the best fit for your needs`,
    };
  }
}

export default BootstrapIntelligence;
