"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalUnifiedPlanner = exports.UnifiedPlanner = void 0;
const agent_1 = require("../../types/agent");
const uuid_1 = require("uuid");
class UnifiedPlanner {
    async createPlan(intent) {
        const steps = this.generateExecutionSteps(intent);
        const checkpoints = this.createCheckpoints(steps);
        const dependencies = this.identifyDependencies(steps);
        const plan = {
            id: (0, uuid_1.v4)(),
            intent,
            steps,
            estimatedDuration: this.estimateDuration(steps),
            checkpoints,
            rollbackable: this.checkRollbackability(steps),
            dependencies,
        };
        return plan;
    }
    generateExecutionSteps(intent) {
        const steps = [];
        switch (intent.type) {
            case agent_1.IntentType.CREATE_PROJECT:
                return this.planProjectCreation(intent);
            case agent_1.IntentType.ADD_FEATURE:
                return this.planFeatureAddition(intent);
            case agent_1.IntentType.FIX_BUG:
                return this.planBugFix(intent);
            case agent_1.IntentType.REFACTOR:
                return this.planRefactoring(intent);
            default:
                return this.planCustomTask(intent);
        }
    }
    planProjectCreation(intent) {
        const framework = intent.parameters.framework || 'react';
        const projectName = intent.parameters.projectName || 'new-project';
        return [
            {
                id: (0, uuid_1.v4)(),
                order: 1,
                action: agent_1.ActionType.RUN_COMMAND,
                description: `Create ${framework} project structure`,
                narrative: `Creating ${framework} project "${projectName}"...`,
                target: projectName,
                parameters: { framework, projectName },
                expectedOutput: 'Project created successfully',
                errorHandling: [{ condition: 'command_failed', action: 'retry', retries: 2, backoff: 1000 }],
                checkpoint: 'project_structure_created',
            },
            {
                id: (0, uuid_1.v4)(),
                order: 2,
                action: agent_1.ActionType.CREATE_FOLDER,
                description: 'Set up project directories',
                narrative: 'Setting up project directories...',
                target: projectName,
                parameters: { structure: ['src', 'public', 'tests'] },
                expectedOutput: 'Directories created',
                errorHandling: [],
                checkpoint: 'directories_created',
            },
            {
                id: (0, uuid_1.v4)(),
                order: 3,
                action: agent_1.ActionType.INSTALL_PACKAGE,
                description: 'Install dependencies',
                narrative: 'Installing dependencies. This may take a moment...',
                target: projectName,
                parameters: { packages: [] },
                expectedOutput: 'Dependencies installed',
                errorHandling: [{ condition: 'command_failed', action: 'retry', retries: 3, backoff: 2000 }],
                checkpoint: 'dependencies_installed',
            },
            {
                id: (0, uuid_1.v4)(),
                order: 4,
                action: agent_1.ActionType.GENERATE_CODE,
                description: 'Generate initial components',
                narrative: 'Generating starter components...',
                target: 'src',
                parameters: { framework, components: ['App', 'Home'] },
                expectedOutput: 'Components generated',
                errorHandling: [],
                checkpoint: 'initial_components_generated',
            },
            {
                id: (0, uuid_1.v4)(),
                order: 5,
                action: agent_1.ActionType.UPDATE_CONFIG,
                description: 'Configure build and development settings',
                narrative: 'Configuring build and development tools...',
                target: projectName,
                parameters: { configs: ['vite', 'tsconfig', 'eslint'] },
                expectedOutput: 'Configuration complete',
                errorHandling: [],
            },
        ];
    }
    planFeatureAddition(intent) {
        const featureName = intent.parameters.featureName || 'NewFeature';
        return [
            {
                id: (0, uuid_1.v4)(),
                order: 1,
                action: agent_1.ActionType.ANALYZE_CODE,
                description: 'Analyze existing codebase',
                narrative: 'Analyzing the current codebase structure...',
                target: '.',
                parameters: { depth: 3 },
                expectedOutput: 'Analysis complete',
                errorHandling: [],
            },
            {
                id: (0, uuid_1.v4)(),
                order: 2,
                action: agent_1.ActionType.GENERATE_CODE,
                description: `Generate ${featureName} component`,
                narrative: `Creating ${featureName} component...`,
                target: 'src/components',
                parameters: { name: featureName, type: 'component' },
                expectedOutput: 'Component created',
                errorHandling: [],
            },
            {
                id: (0, uuid_1.v4)(),
                order: 3,
                action: agent_1.ActionType.MODIFY_FILE,
                description: 'Integrate component into application',
                narrative: `Integrating ${featureName} into your app...`,
                target: 'src/App.tsx',
                parameters: { componentName: featureName, action: 'import_and_use' },
                expectedOutput: 'Component integrated',
                errorHandling: [],
            },
            {
                id: (0, uuid_1.v4)(),
                order: 4,
                action: agent_1.ActionType.GENERATE_CODE,
                description: 'Generate tests for new feature',
                narrative: `Creating tests for ${featureName}...`,
                target: 'src/tests',
                parameters: { componentName: featureName },
                expectedOutput: 'Tests created',
                errorHandling: [],
            },
        ];
    }
    planBugFix(intent) {
        return [
            {
                id: (0, uuid_1.v4)(),
                order: 1,
                action: agent_1.ActionType.ANALYZE_CODE,
                description: 'Analyze error and locate source',
                narrative: 'Analyzing the error...',
                target: '.',
                parameters: { errorContext: intent.raw },
                expectedOutput: 'Error source identified',
                errorHandling: [],
            },
            {
                id: (0, uuid_1.v4)(),
                order: 2,
                action: agent_1.ActionType.MODIFY_FILE,
                description: 'Apply fix',
                narrative: 'Applying fix...',
                target: '.',
                parameters: { fix: true },
                expectedOutput: 'Fix applied',
                errorHandling: [],
            },
            {
                id: (0, uuid_1.v4)(),
                order: 3,
                action: agent_1.ActionType.RUN_COMMAND,
                description: 'Test the fix',
                narrative: 'Testing the fix...',
                target: '.',
                parameters: { command: 'test' },
                expectedOutput: 'Tests pass',
                errorHandling: [{ condition: 'command_failed', action: 'retry', retries: 2, backoff: 1000 }],
            },
        ];
    }
    planRefactoring(intent) {
        return [
            {
                id: (0, uuid_1.v4)(),
                order: 1,
                action: agent_1.ActionType.ANALYZE_CODE,
                description: 'Identify refactoring opportunities',
                narrative: 'Analyzing code for improvement opportunities...',
                target: '.',
                parameters: { analysis: 'refactoring' },
                expectedOutput: 'Refactoring targets identified',
                errorHandling: [],
            },
            {
                id: (0, uuid_1.v4)(),
                order: 2,
                action: agent_1.ActionType.MODIFY_FILE,
                description: 'Apply refactoring changes',
                narrative: 'Refactoring code...',
                target: '.',
                parameters: { refactor: true },
                expectedOutput: 'Refactoring complete',
                errorHandling: [],
            },
            {
                id: (0, uuid_1.v4)(),
                order: 3,
                action: agent_1.ActionType.RUN_COMMAND,
                description: 'Verify refactoring with tests',
                narrative: 'Running tests to verify refactoring...',
                target: '.',
                parameters: { command: 'test' },
                expectedOutput: 'All tests pass',
                errorHandling: [],
            },
        ];
    }
    planCustomTask(intent) {
        return [
            {
                id: (0, uuid_1.v4)(),
                order: 1,
                action: agent_1.ActionType.ANALYZE_CODE,
                description: 'Understand the request',
                narrative: 'Understanding your request...',
                target: '.',
                parameters: { context: intent.raw },
                expectedOutput: 'Plan created',
                errorHandling: [],
            },
        ];
    }
    createCheckpoints(steps) {
        return steps
            .filter((step) => step.checkpoint)
            .map((step, index) => ({
            id: (0, uuid_1.v4)(),
            afterStep: step.order,
            validation: this.createValidationRules(step),
            recoveryStrategy: step.errorHandling[0],
        }));
    }
    createValidationRules(step) {
        const rules = [];
        if (step.action === agent_1.ActionType.CREATE_FILE) {
            rules.push({
                type: 'file_exists',
                target: step.target,
                expected: '',
            });
        }
        if (step.action === agent_1.ActionType.RUN_COMMAND) {
            rules.push({
                type: 'command_success',
                target: step.target,
                expected: step.expectedOutput,
            });
        }
        return rules;
    }
    identifyDependencies(steps) {
        const deps = new Set();
        for (let i = 1; i < steps.length; i++) {
            deps.add(steps[i - 1].id);
        }
        return Array.from(deps);
    }
    estimateDuration(steps) {
        // Simple estimation: 2 seconds per step on average
        return steps.length * 2000;
    }
    checkRollbackability(steps) {
        // Can rollback if no permanent changes made
        const permanentActions = [agent_1.ActionType.DELETE_FILE];
        return !steps.some((step) => permanentActions.includes(step.action));
    }
}
exports.UnifiedPlanner = UnifiedPlanner;
exports.globalUnifiedPlanner = new UnifiedPlanner();
//# sourceMappingURL=unifiedPlanner.js.map