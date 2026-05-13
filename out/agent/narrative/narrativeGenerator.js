"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalNarrativeGenerator = exports.NarrativeGenerator = void 0;
const agent_1 = require("../../types/agent");
const uuid_1 = require("uuid");
class NarrativeGenerator {
    narrativeTemplates = new Map([
        [agent_1.ActionType.CREATE_FILE, [
                'Creating {{target}}...',
                'Setting up {{target}}...',
                'Writing {{target}}...',
            ]],
        [agent_1.ActionType.MODIFY_FILE, [
                'Updating {{target}}...',
                'Modifying {{target}}...',
                'Refining {{target}}...',
            ]],
        [agent_1.ActionType.DELETE_FILE, [
                'Cleaning up {{target}}...',
                'Removing {{target}}...',
            ]],
        [agent_1.ActionType.CREATE_FOLDER, [
                'Creating folder structure...',
                'Setting up directories...',
                'Organizing project folders...',
            ]],
        [agent_1.ActionType.INSTALL_PACKAGE, [
                'Installing dependencies...',
                'Setting up packages...',
                'This may take a moment...',
            ]],
        [agent_1.ActionType.RUN_COMMAND, [
                'Running {{target}}...',
                'Executing setup...',
                'Building project...',
            ]],
        [agent_1.ActionType.GENERATE_CODE, [
                'Generating {{target}}...',
                'Creating {{target}}...',
                'Writing {{target}}...',
            ]],
        [agent_1.ActionType.ANALYZE_CODE, [
                'Analyzing {{target}}...',
                'Understanding {{target}}...',
                'Examining {{target}}...',
            ]],
        [agent_1.ActionType.UPDATE_CONFIG, [
                'Configuring {{target}}...',
                'Setting up {{target}} configuration...',
                'Applying settings...',
            ]],
    ]);
    generateNarrativeEvent(step, stepNumber, totalSteps) {
        const narrative = this.generateNarrative(step);
        const progress = Math.round((stepNumber / totalSteps) * 100);
        return {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            type: 'progress',
            message: narrative,
            step: step.id,
            progress,
        };
    }
    generateCompleteNarrative(steps) {
        const narratives = steps.map((step) => step.narrative || this.generateNarrative(step));
        return narratives.join('\n');
    }
    generateSuccessNarrative(stepCount, duration) {
        const messages = [
            `All done! I've completed ${stepCount} steps in ${this.formatDuration(duration)}.`,
            `Perfect! Finished in ${this.formatDuration(duration)}.`,
            `Success! Everything is set up and ready to go.`,
            `All ${stepCount} steps completed successfully!`,
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }
    generateErrorNarrative(step, error) {
        const context = `while ${step.description}`;
        return `I encountered an issue ${context}: ${error}. Let me fix that...`;
    }
    generateRecoveryNarrative(attempt) {
        if (attempt === 1)
            return 'Let me try again...';
        if (attempt === 2)
            return 'Trying a different approach...';
        return 'One more attempt...';
    }
    generateProgressSummary(completedSteps, totalSteps, currentStep) {
        const percentage = Math.round((completedSteps / totalSteps) * 100);
        return `${percentage}% complete - ${currentStep}`;
    }
    generateRecommendation(context) {
        const recommendations = {
            project_created: [
                'Your project is ready! Would you like me to add authentication?',
                'Project created! I can add a database connection if you\'d like.',
                'All set! Need me to set up testing?',
            ],
            feature_added: [
                'Feature added! Want me to create tests for it?',
                'Done! Shall I add styling to match your project?',
                'Complete! Ready to move on to the next feature?',
            ],
            bug_fixed: [
                'Bug fixed! Everything should work smoothly now.',
                'All fixed! The issue is resolved.',
                'Issue cleared! You\'re good to go.',
            ],
        };
        const messages = recommendations[context] || ['All done!'];
        return messages[Math.floor(Math.random() * messages.length)];
    }
    generateNarrative(step) {
        if (step.narrative) {
            return step.narrative;
        }
        const templates = this.narrativeTemplates.get(step.action);
        if (!templates || templates.length === 0) {
            return `${step.description}...`;
        }
        const template = templates[Math.floor(Math.random() * templates.length)];
        return template.replace('{{target}}', step.target);
    }
    formatDuration(ms) {
        if (ms < 1000)
            return `${Math.round(ms)}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }
}
exports.NarrativeGenerator = NarrativeGenerator;
exports.globalNarrativeGenerator = new NarrativeGenerator();
//# sourceMappingURL=narrativeGenerator.js.map