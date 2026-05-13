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
exports.globalIntentEngine = exports.IntentEngine = void 0;
const vscode = __importStar(require("vscode"));
const agent_1 = require("../../types/agent");
class IntentEngine {
    context;
    framework = '';
    projectStyle = {};
    constructor(context) {
        this.context = context;
        this.loadKnowledge();
    }
    async analyzeIntent(userMessage) {
        const message = userMessage.toLowerCase().trim();
        const confidence = this.calculateConfidence(message);
        const type = this.recognizeIntentType(message);
        const context = await this.buildIntentContext();
        const parameters = this.extractParameters(message, type);
        const requiredInfo = this.identifyMissingInfo(message, type);
        const suggestedQuestions = this.generateContextualQuestions(type, requiredInfo);
        return {
            raw: userMessage,
            understood: this.paraphraseIntent(message, type),
            type,
            confidence,
            requiredInfo,
            suggestedQuestions,
            context,
            parameters,
        };
    }
    recognizeIntentType(message) {
        // Create keyword patterns for each intent type
        const patterns = {
            [agent_1.IntentType.CREATE_PROJECT]: /^(?:create|start|new|initialize|set up).*(project|app|react|vue|next|nuxt)/i,
            [agent_1.IntentType.ADD_FEATURE]: /(?:add|create|implement|build|generate).*(feature|component|page|function|endpoint)/i,
            [agent_1.IntentType.FIX_BUG]: /(?:fix|debug|resolve|repair|solve).*(bug|error|issue|problem)/i,
            [agent_1.IntentType.REFACTOR]: /(?:refactor|improve|optimize|clean|reorganize).*(code|structure|component)/i,
            [agent_1.IntentType.EXPLAIN]: /(?:explain|what|how|why|tell me).*(?:this|that|the)/i,
            [agent_1.IntentType.ANALYZE]: /(?:analyze|check|review|inspect|understand).*(code|project|structure)/i,
            [agent_1.IntentType.OPTIMIZE]: /(?:optimize|speed up|improve|enhance|make.*faster)/i,
            [agent_1.IntentType.GENERATE_CODE]: /(?:generate|write|create|make).*(code|function|component|test)/i,
            [agent_1.IntentType.SETUP_CONFIG]: /(?:setup|configure|initialize).*(config|environment|env)/i,
            [agent_1.IntentType.INSTALL_DEPS]: /(?:install|add|remove).*(package|dependency|library)/i,
            [agent_1.IntentType.CUSTOM]: /(?:)/,
        };
        for (const [intentType, pattern] of Object.entries(patterns)) {
            if (pattern.test(message)) {
                return intentType;
            }
        }
        return agent_1.IntentType.CUSTOM;
    }
    calculateConfidence(message) {
        // Simple confidence scoring based on message clarity
        let score = 0.5; // Base score
        // Add points for specificity
        if (message.includes('react'))
            score += 0.15;
        if (message.includes('component'))
            score += 0.1;
        if (message.includes('with') || message.includes('using'))
            score += 0.1;
        if (message.length > 20)
            score += 0.05;
        if (message.length > 50)
            score += 0.05;
        return Math.min(0.99, score);
    }
    extractParameters(message, type) {
        const params = {};
        // Extract framework/library mentions
        const frameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'astro', 'remix'];
        for (const fw of frameworks) {
            if (message.toLowerCase().includes(fw)) {
                params.framework = fw;
                break;
            }
        }
        // Extract styling mentions
        const styles = ['tailwind', 'css', 'styled-components', 'sass', 'bootstrap', 'material-ui'];
        for (const style of styles) {
            if (message.toLowerCase().includes(style)) {
                params.styling = style;
                break;
            }
        }
        // Extract project name if mentioned
        const nameMatch = message.match(/(?:called|named|for|project)\s+["']?([a-zA-Z0-9-_]+)["']?/i);
        if (nameMatch) {
            params.projectName = nameMatch[1];
        }
        return params;
    }
    identifyMissingInfo(message, type) {
        const missing = [];
        // Check for required information based on intent type
        switch (type) {
            case agent_1.IntentType.CREATE_PROJECT:
                if (!message.includes('react') && !message.includes('vue') && !message.includes('next')) {
                    missing.push('framework');
                }
                if (!message.match(/(?:called|named)\s+\w+/i)) {
                    missing.push('project_name');
                }
                break;
            case agent_1.IntentType.ADD_FEATURE:
                if (!message.match(/component|page|function|feature/i)) {
                    missing.push('feature_type');
                }
                break;
            case agent_1.IntentType.FIX_BUG:
                if (!message.match(/error|console|crash/i)) {
                    missing.push('error_description');
                }
                break;
        }
        return missing;
    }
    generateContextualQuestions(type, missing) {
        const questions = [];
        if (missing.includes('framework')) {
            questions.push('What framework would you like? (React, Vue, Next.js, etc.)');
        }
        if (missing.includes('project_name')) {
            questions.push('What should I call this project?');
        }
        if (missing.includes('feature_type')) {
            questions.push('What type of component or feature? (React component, API endpoint, etc.)');
        }
        if (missing.includes('error_description')) {
            questions.push('Can you describe the error you\'re seeing?');
        }
        return questions.slice(0, 2); // Return max 2 questions
    }
    paraphraseIntent(message, type) {
        const paraphrases = {
            [agent_1.IntentType.CREATE_PROJECT]: 'Create a new project',
            [agent_1.IntentType.ADD_FEATURE]: 'Add a new feature',
            [agent_1.IntentType.FIX_BUG]: 'Fix a bug',
            [agent_1.IntentType.REFACTOR]: 'Improve the code structure',
            [agent_1.IntentType.EXPLAIN]: 'Explain something about the code',
            [agent_1.IntentType.ANALYZE]: 'Analyze the codebase',
            [agent_1.IntentType.OPTIMIZE]: 'Optimize performance',
            [agent_1.IntentType.GENERATE_CODE]: 'Generate code',
            [agent_1.IntentType.SETUP_CONFIG]: 'Set up configuration',
            [agent_1.IntentType.INSTALL_DEPS]: 'Manage dependencies',
            [agent_1.IntentType.CUSTOM]: message,
        };
        return paraphrases[type] || message;
    }
    async buildIntentContext() {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        return {
            projectRoot: workspaceRoot,
            currentFramework: this.framework,
            userStyle: this.projectStyle.indentation,
        };
    }
    loadKnowledge() {
        // Load stored framework knowledge
        const stored = this.context.globalState.get('sinterFramework');
        if (stored) {
            this.framework = stored;
        }
        // Load code style
        const style = this.context.globalState.get('sinterCodeStyle');
        if (style) {
            this.projectStyle = style;
        }
    }
}
exports.IntentEngine = IntentEngine;
exports.globalIntentEngine = new IntentEngine(vscode.extensions.getExtension('Sinter.sinter-ai')?.extensionContext);
//# sourceMappingURL=intentEngine.js.map