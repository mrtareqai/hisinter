// ═══════════════════════════════════════════════════════════════
// Sinter AI — Thinking Engine ⭐
// Classifies tasks and builds adaptive thinking strategies
// The "brain" that decides HOW to approach each request
// ═══════════════════════════════════════════════════════════════

export type TaskType =
    | 'explore'     // "شوف المشروع" → full scan
    | 'analyze'     // "حلل الأخطاء" → deep analysis
    | 'plan'        // "اعمل خطة" → structured planning
    | 'implement'   // "أنشئ ملف" → direct creation
    | 'fix'         // "اصلح الخطأ" → targeted debugging
    | 'refactor'    // "حسّن الكود" → restructure
    | 'explain'     // "اشرح" → educational
    | 'quick';      // "افتح google" → instant action

export interface ThinkingStep {
    phase: 'explore' | 'read' | 'analyze' | 'plan' | 'execute' | 'verify' | 'summarize';
    description: string;
    tools: string[];
    optional?: boolean;
}

export interface ThinkingStrategy {
    type: TaskType;
    steps: ThinkingStep[];
    maxDepth: number;
    gatherContext: boolean;
    multiTool: boolean;
    maxIterations: number;
}

// ─── Keywords for task classification ───────────────────────
const TASK_PATTERNS: { type: TaskType; keywords: string[] }[] = [
    {
        type: 'explore',
        keywords: [
            'شوف المشروع', 'استكشف', 'اعرض الملفات', 'map the project',
            'explore', 'show structure', 'what files', 'list project',
            'understand codebase', 'project overview', 'ايش عندي',
        ],
    },
    {
        type: 'analyze',
        keywords: [
            'حلل', 'راجع', 'audit', 'analyze', 'review', 'inspect',
            'find issues', 'code review', 'check quality', 'what can be improved',
            'نقاط الضعف', 'مشاكل', 'full analysis', 'deep dive',
        ],
    },
    {
        type: 'plan',
        keywords: [
            'اعمل خطة', 'خطط', 'plan', 'roadmap', 'strategy',
            'implementation plan', 'how should i', 'design',
            'architecture', 'propose', 'suggest approach',
        ],
    },
    {
        type: 'fix',
        keywords: [
            'اصلح', 'fix', 'debug', 'error', 'bug', 'broken',
            'not working', 'crash', 'fail', 'خطأ', 'مشكلة',
            'عطل', 'لا يعمل', 'solve', 'resolve',
        ],
    },
    {
        type: 'refactor',
        keywords: [
            'حسّن', 'حسن', 'improve', 'refactor', 'optimize',
            'clean up', 'restructure', 'simplify', 'تحسين',
            'اعد هيكلة', 'reorganize', 'better performance',
        ],
    },
    {
        type: 'explain',
        keywords: [
            'اشرح', 'explain', 'what is', 'how does', 'why',
            'tell me about', 'describe', 'وضح', 'كيف يعمل',
            'ما هو', 'ليش', 'understand',
        ],
    },
    {
        type: 'implement',
        keywords: [
            'أنشئ', 'انشئ', 'create', 'make', 'build', 'write',
            'generate', 'add', 'implement', 'اكتب', 'اضف',
            'اصنع', 'ابني', 'new file', 'new feature',
        ],
    },
    {
        type: 'quick',
        keywords: [
            'افتح', 'open', 'run', 'شغل', 'execute', 'launch',
            'start', 'stop', 'screenshot', 'click', 'type',
            'search', 'ابحث', 'download', 'install',
        ],
    },
];

// ─── Strategy Templates ────────────────────────────────────
const STRATEGIES: Record<TaskType, Omit<ThinkingStrategy, 'type'>> = {
    explore: {
        steps: [
            { phase: 'explore', description: 'Scan workspace structure', tools: ['file_list'] },
            { phase: 'read', description: 'Read config files', tools: ['file_read'] },
            { phase: 'read', description: 'Read source files', tools: ['file_read'] },
            { phase: 'analyze', description: 'Analyze architecture', tools: [] },
            { phase: 'summarize', description: 'Present structured report', tools: [] },
        ],
        maxDepth: 4,
        gatherContext: true,
        multiTool: true,
        maxIterations: 20,
    },
    analyze: {
        steps: [
            { phase: 'explore', description: 'Scan workspace', tools: ['file_list'] },
            { phase: 'read', description: 'Read all source files', tools: ['file_read'] },
            { phase: 'analyze', description: 'Deep analysis', tools: [] },
            { phase: 'plan', description: 'Build improvement suggestions', tools: [] },
            { phase: 'summarize', description: 'Present analysis report', tools: [] },
        ],
        maxDepth: 5,
        gatherContext: true,
        multiTool: true,
        maxIterations: 25,
    },
    plan: {
        steps: [
            { phase: 'explore', description: 'Understand current state', tools: ['file_list'] },
            { phase: 'read', description: 'Read relevant files', tools: ['file_read'] },
            { phase: 'analyze', description: 'Identify requirements', tools: [] },
            { phase: 'plan', description: 'Create phased plan', tools: [] },
            { phase: 'summarize', description: 'Present plan', tools: [] },
        ],
        maxDepth: 4,
        gatherContext: true,
        multiTool: true,
        maxIterations: 20,
    },
    fix: {
        steps: [
            { phase: 'read', description: 'Read target file', tools: ['file_read'] },
            { phase: 'analyze', description: 'Identify bug', tools: [] },
            { phase: 'execute', description: 'Apply fix', tools: ['file_write'] },
            { phase: 'verify', description: 'Verify fix', tools: ['terminal_run'], optional: true },
        ],
        maxDepth: 2,
        gatherContext: true,
        multiTool: true,
        maxIterations: 10,
    },
    refactor: {
        steps: [
            { phase: 'read', description: 'Read current code', tools: ['file_read'] },
            { phase: 'analyze', description: 'Find improvement areas', tools: [] },
            { phase: 'plan', description: 'Plan changes', tools: [] },
            { phase: 'execute', description: 'Apply refactoring', tools: ['file_write'] },
            { phase: 'verify', description: 'Verify changes', tools: ['terminal_run'], optional: true },
        ],
        maxDepth: 3,
        gatherContext: true,
        multiTool: true,
        maxIterations: 15,
    },
    explain: {
        steps: [
            { phase: 'read', description: 'Read target code', tools: ['file_read'] },
            { phase: 'analyze', description: 'Understand code', tools: [] },
            { phase: 'summarize', description: 'Explain clearly', tools: [] },
        ],
        maxDepth: 2,
        gatherContext: true,
        multiTool: false,
        maxIterations: 5,
    },
    implement: {
        steps: [
            { phase: 'explore', description: 'Check existing structure', tools: ['file_list'], optional: true },
            { phase: 'plan', description: 'Plan implementation', tools: [] },
            { phase: 'execute', description: 'Create/modify files', tools: ['file_write', 'code_create_file'] },
            { phase: 'verify', description: 'Verify result', tools: ['terminal_run'], optional: true },
        ],
        maxDepth: 2,
        gatherContext: false,
        multiTool: true,
        maxIterations: 12,
    },
    quick: {
        steps: [
            { phase: 'execute', description: 'Execute action', tools: [] },
        ],
        maxDepth: 0,
        gatherContext: false,
        multiTool: false,
        maxIterations: 3,
    },
};

export class ThinkingEngine {

    /** Classify a user message into a task type */
    classifyTask(message: string): TaskType {
        const lower = message.toLowerCase();

        // Score each type
        let bestType: TaskType = 'quick';
        let bestScore = 0;

        for (const pattern of TASK_PATTERNS) {
            let score = 0;
            for (const kw of pattern.keywords) {
                if (lower.includes(kw)) {
                    // Longer keywords get more weight
                    score += kw.length;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestType = pattern.type;
            }
        }

        // If no strong match but message is long, likely needs analysis
        if (bestScore === 0 && message.length > 100) {
            return 'analyze';
        }

        return bestType;
    }

    /** Build a thinking strategy for the given task */
    buildStrategy(taskType: TaskType): ThinkingStrategy {
        const template = STRATEGIES[taskType];
        return { type: taskType, ...template };
    }

    /** Determine if this task needs deep exploration first */
    needsExploration(taskType: TaskType): boolean {
        return ['explore', 'analyze', 'plan', 'refactor'].includes(taskType);
    }

    /** Determine if this is a quick single-tool task */
    isQuickTask(taskType: TaskType): boolean {
        return taskType === 'quick';
    }

    /** Get the system prompt enhancement for this task type */
    getTaskPromptEnhancement(taskType: TaskType): string {
        const baseEnhancements: Record<TaskType, string> = {
            explore: '\nYou MUST explore the ENTIRE project first. Use file_list recursively, then file_read on EVERY source file. Build a complete understanding before responding.',
            analyze: '\nDo a DEEP analysis. Read ALL source files. Identify architecture, patterns, issues, and suggestions. Present findings in a structured format with tables.',
            plan: '\nCreate a DETAILED implementation plan. First understand the current state by reading files, then propose phased changes with specific file modifications.',
            fix: '\nFocus on finding and fixing the specific issue. Read the relevant file, identify the bug, apply the fix, and verify.',
            refactor: '\nAnalyze the code structure first. Identify what can be improved, then make changes while maintaining functionality.',
            explain: '\nRead the relevant code and explain it clearly. Use examples and analogies.',
            implement: '\nPlan the implementation first, then create/modify files systematically. Verify the result.',
            quick: '',
        };

        // DS 6.7B Specific Optimizations
        const ds67bEnhancements = `
DEEPSEEK-CODER OPTIMIZATION:
- BE CONCISE: Use minimal tokens for thoughts.
- VERIFY: After every action, explicitly check if the result matches expectations.
- STEP-BY-STEP: Decompose complex tasks into 3-5 small, verifiable steps.
- ARCHITECTURAL AWARENESS: Always consider how a change in one file affects its dependents.
- SELF-CORRECTION: If a tool fails or output is unexpected, stop and re-analyze.
`;

        return baseEnhancements[taskType] + '\n' + ds67bEnhancements;
    }
}
