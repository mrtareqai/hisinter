import * as vscode from 'vscode';
import { UserIntent, IntentType, IntentContext } from '../../types/agent';

export class IntentEngine {
  private context: vscode.ExtensionContext;
  private framework: string = '';
  private projectStyle: Record<string, unknown> = {};

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadKnowledge();
  }

  async analyzeIntent(userMessage: string): Promise<UserIntent> {
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

  private recognizeIntentType(message: string): IntentType {
    // Create keyword patterns for each intent type
    const patterns: Record<IntentType, RegExp> = {
      [IntentType.CREATE_PROJECT]: /^(?:create|start|new|initialize|set up).*(project|app|react|vue|next|nuxt)/i,
      [IntentType.ADD_FEATURE]: /(?:add|create|implement|build|generate).*(feature|component|page|function|endpoint)/i,
      [IntentType.FIX_BUG]: /(?:fix|debug|resolve|repair|solve).*(bug|error|issue|problem)/i,
      [IntentType.REFACTOR]: /(?:refactor|improve|optimize|clean|reorganize).*(code|structure|component)/i,
      [IntentType.EXPLAIN]: /(?:explain|what|how|why|tell me).*(?:this|that|the)/i,
      [IntentType.ANALYZE]: /(?:analyze|check|review|inspect|understand).*(code|project|structure)/i,
      [IntentType.OPTIMIZE]: /(?:optimize|speed up|improve|enhance|make.*faster)/i,
      [IntentType.GENERATE_CODE]: /(?:generate|write|create|make).*(code|function|component|test)/i,
      [IntentType.SETUP_CONFIG]: /(?:setup|configure|initialize).*(config|environment|env)/i,
      [IntentType.INSTALL_DEPS]: /(?:install|add|remove).*(package|dependency|library)/i,
      [IntentType.CUSTOM]: /(?:)/,
    };

    for (const [intentType, pattern] of Object.entries(patterns)) {
      if (pattern.test(message)) {
        return intentType as IntentType;
      }
    }

    return IntentType.CUSTOM;
  }

  private calculateConfidence(message: string): number {
    // Simple confidence scoring based on message clarity
    let score = 0.5; // Base score

    // Add points for specificity
    if (message.includes('react')) score += 0.15;
    if (message.includes('component')) score += 0.1;
    if (message.includes('with') || message.includes('using')) score += 0.1;
    if (message.length > 20) score += 0.05;
    if (message.length > 50) score += 0.05;

    return Math.min(0.99, score);
  }

  private extractParameters(message: string, type: IntentType): Record<string, unknown> {
    const params: Record<string, unknown> = {};

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

  private identifyMissingInfo(message: string, type: IntentType): string[] {
    const missing: string[] = [];

    // Check for required information based on intent type
    switch (type) {
      case IntentType.CREATE_PROJECT:
        if (!message.includes('react') && !message.includes('vue') && !message.includes('next')) {
          missing.push('framework');
        }
        if (!message.match(/(?:called|named)\s+\w+/i)) {
          missing.push('project_name');
        }
        break;

      case IntentType.ADD_FEATURE:
        if (!message.match(/component|page|function|feature/i)) {
          missing.push('feature_type');
        }
        break;

      case IntentType.FIX_BUG:
        if (!message.match(/error|console|crash/i)) {
          missing.push('error_description');
        }
        break;
    }

    return missing;
  }

  private generateContextualQuestions(type: IntentType, missing: string[]): string[] {
    const questions: string[] = [];

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

  private paraphraseIntent(message: string, type: IntentType): string {
    const paraphrases: Record<IntentType, string> = {
      [IntentType.CREATE_PROJECT]: 'Create a new project',
      [IntentType.ADD_FEATURE]: 'Add a new feature',
      [IntentType.FIX_BUG]: 'Fix a bug',
      [IntentType.REFACTOR]: 'Improve the code structure',
      [IntentType.EXPLAIN]: 'Explain something about the code',
      [IntentType.ANALYZE]: 'Analyze the codebase',
      [IntentType.OPTIMIZE]: 'Optimize performance',
      [IntentType.GENERATE_CODE]: 'Generate code',
      [IntentType.SETUP_CONFIG]: 'Set up configuration',
      [IntentType.INSTALL_DEPS]: 'Manage dependencies',
      [IntentType.CUSTOM]: message,
    };

    return paraphrases[type] || message;
  }

  private async buildIntentContext(): Promise<IntentContext> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    return {
      projectRoot: workspaceRoot,
      currentFramework: this.framework,
      userStyle: this.projectStyle.indentation as string,
    };
  }

  private loadKnowledge(): void {
    // Load stored framework knowledge
    const stored = this.context.globalState.get('sinterFramework');
    if (stored) {
      this.framework = stored as string;
    }

    // Load code style
    const style = this.context.globalState.get('sinterCodeStyle');
    if (style) {
      this.projectStyle = style as Record<string, unknown>;
    }
  }
}

export const globalIntentEngine = new IntentEngine(vscode.extensions.getExtension('Sinter.sinter-ai')?.extensionContext!);
