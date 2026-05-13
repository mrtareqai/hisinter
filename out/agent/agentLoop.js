"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Agent Loop ⭐ (v8 — Intelligence Overhaul)
// Optimized prompts for small models (6.7B)
// Smart context: workspace map, task ledger, open tabs
// ═══════════════════════════════════════════════════════════════
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
exports.AgentLoop = void 0;
const vscode = __importStar(require("vscode"));
const ollamaClient_1 = require("../ai/ollamaClient");
const modelAdapter_1 = require("../ai/modelAdapter");
const codebaseExplorer_1 = require("./codebaseExplorer");
const analysisPipeline_1 = require("./analysisPipeline");
const planBuilder_1 = require("./planBuilder");
const progressReporter_1 = require("./progressReporter");
const autonomousRuntimeState_1 = require("../runtime/autonomousRuntimeState");
const contextCompressor_1 = require("../runtime/contextCompressor");
const validationRunner_1 = require("../runtime/validationRunner");
const workspaceMap_1 = require("../context/workspaceMap");
const CHAT_PROMPT = `You are Sinter AI, a helpful coding assistant. Be friendly, concise, and helpful.
When the user asks you to DO something (create, edit, run), suggest switching to Agent mode.`;
const AGENT_PROMPT = `You are Sinter AI, an autonomous coding agent.
You WRITE original, creative code yourself. You are an INVENTOR.

CRITICAL RULES:
1. ALWAYS start your response with your reasoning/chain-of-thought wrapped in <thought> tags.
   Example: <thought>I will create an index.html first with a dark theme...</thought>
2. When asked to CREATE: use file_write for EACH file with your OWN code.
3. When asked to EDIT: file_read first, then file_replace/file_insert.
4. After each tool, check results. Continue until fully DONE.
5. Make everything beautiful (dark themes, gradients, animations).

WORKFLOW:
<thought>Step 1: Plan... Step 2: Tool choice...</thought>
[Tool Call or Response]`;
const COMPUTER_PROMPT = `You are Sinter AI controlling the desktop.
ALWAYS start with <thought>reasoning</thought>.
WORKFLOW: screenshot → analyze → act → screenshot → verify.`;
const MAX_PROMPT = `You are Sinter AI in Max mode. Powerful and autonomous.
You WRITE all code yourself. You are creative and original.

RULES:
1. ALWAYS start your response with reasoning wrapped in <thought> tags.
2. CREATE: Write files yourself using file_write.
3. EDIT: file_read → file_replace/file_insert.
4. RUN: terminal_run to execute code.
5. Work step by step. Make it look AMAZING.
6. NEVER just print code. USE TOOLS.

WORKFLOW:
<thought>Analysis of goal... Step-by-step plan...</thought>
[Tool Call or Response]`;
const DEEP_PROMPT = `You are Sinter AI doing deep code analysis.
1. Explore project: file_list
2. Read source files: file_read
3. Analyze architecture, patterns, dependencies
4. Find strengths, weaknesses, improvements
5. Build a structured plan with phases
6. Report findings with tables and priorities.`;
const PLANNING_PROMPT = `You are Sinter AI in Planning Mode.
Build execution plans. Break goals into scoped tasks. Name files for each task. Do NOT edit until execution starts.`;
const DEBUG_PROMPT = `You are Sinter AI in Debug Mode.
Reproduce failure → inspect context → patch files (file_read → file_replace) → validate → retry if needed.`;
const MONITOR_PROMPT = `You are Sinter AI. Report: goal state, tasks, execution status, validation, model route, failures.`;
const RUNTIME_STABILITY_PROMPT = `
[Rules]
- EDIT files: file_read first, then file_replace/file_insert. Never guess file content.
- For large tasks: track goal, phase, files touched, next step.
- If a command/edit repeats, change strategy.
- After edits, verify the change worked.
[/Rules]`;
const ACTION_KEYWORDS = [
    'create', 'make', 'build', 'write', 'code', 'generate', 'open', 'run', 'execute',
    'launch', 'start', 'delete', 'remove', 'install', 'search', 'find', 'download',
    'screenshot', 'click', 'type', 'control', 'move', 'scroll', 'fix', 'edit', 'read',
    'website', 'web app', 'app', 'project', 'scaffold',
    '\u0627\u0639\u0645\u0644', '\u0627\u0628\u0646\u064a', '\u0627\u0646\u0634\u0626', '\u0648\u064a\u0628', '\u0645\u0648\u0642\u0639', '\u0645\u0634\u0631\u0648\u0639',
    'اكتب', 'افتح', 'شغل', 'ابحث', 'حمل', 'انشئ', 'اصنع', 'نفذ', 'امسح', 'اصلح',
];
class AgentLoop {
    client;
    adapter;
    tools;
    config;
    conversationHistory = [];
    mode = 'chat';
    cancelled = false;
    running = false;
    memory = null;
    runtime = new autonomousRuntimeState_1.AutonomousRuntimeState();
    compressor = new contextCompressor_1.ContextCompressor();
    validationRunner = null;
    validationEnabled = true;
    // ─── Workspace Context ──────────────────────────────────
    activeFile = '';
    activeFileContent = '';
    workspaceRoot = '';
    // ─── Task Ledger (tracks what the model is doing) ───────
    taskLedger = { goal: '', filesTouched: [], lastAction: '', stepCount: 0 };
    constructor(tools, config = {}) {
        this.config = {
            model: config.model || 'deepseek-coder:6.7b',
            maxIterations: config.maxIterations || 15,
            systemPrompt: config.systemPrompt || '',
            ollamaUrl: config.ollamaUrl || 'http://localhost:11434',
        };
        this.client = new ollamaClient_1.OllamaClient(this.config.ollamaUrl);
        this.adapter = new modelAdapter_1.ModelAdapter(this.client);
        this.tools = tools;
    }
    setMemory(memory) { this.memory = memory; }
    getMemory() { return this.memory; }
    cancel() { this.cancelled = true; }
    isRunning() { return this.running; }
    setMode(mode) { this.mode = mode; }
    getMode() { return this.mode; }
    setModel(model) { this.config.model = model; this.adapter.clearCache(); }
    setSystemPrompt(prompt) { this.config.systemPrompt = prompt; }
    getHistory() { return [...this.conversationHistory]; }
    getModel() { return this.config.model; }
    getAdapter() { return this.adapter; }
    setValidationEnabled(enabled) {
        this.validationEnabled = enabled;
        if (this.workspaceRoot) {
            this.validationRunner = new validationRunner_1.ValidationRunner(this.workspaceRoot, enabled);
        }
    }
    getRuntimeState() { return this.runtime.snapshot(); }
    // ─── Provider Chain ─────────────────────────────────────
    setProviderChain(chain) {
        this.adapter.setProviderChain(chain);
    }
    getProviderInfo() {
        return {
            provider: this.adapter.getLastProviderUsed() || 'Ollama Local',
            model: this.adapter.getLastModelUsed() || this.config.model,
            isOnline: this.adapter.getIsOnline(),
        };
    }
    // ─── Workspace Awareness ────────────────────────────────
    setActiveFile(filePath, content) {
        this.activeFile = filePath;
        this.activeFileContent = content || '';
    }
    setWorkspaceRoot(root) {
        this.workspaceRoot = root;
        this.validationRunner = new validationRunner_1.ValidationRunner(root, this.validationEnabled);
    }
    getModelCapabilities() {
        return this.adapter.getCapabilities(this.config.model);
    }
    getSystemPrompt() {
        let prompt = this.config.systemPrompt || '';
        if (!prompt) {
            switch (this.mode) {
                case 'agent':
                    prompt = AGENT_PROMPT;
                    break;
                case 'computer':
                    prompt = COMPUTER_PROMPT;
                    break;
                case 'max':
                    prompt = MAX_PROMPT;
                    break;
                case 'deep':
                    prompt = DEEP_PROMPT;
                    break;
                case 'planning':
                    prompt = PLANNING_PROMPT;
                    break;
                case 'debug':
                    prompt = DEBUG_PROMPT;
                    break;
                case 'monitor':
                    prompt = MONITOR_PROMPT;
                    break;
                default:
                    prompt = CHAT_PROMPT;
                    break;
            }
        }
        prompt += '\n' + RUNTIME_STABILITY_PROMPT;
        // ─── Inject workspace map (compact project tree) ────
        if (this.workspaceRoot && this.mode !== 'chat') {
            try {
                prompt += '\n' + (0, workspaceMap_1.getCompactWorkspaceMap)(this.workspaceRoot);
            }
            catch { /* skip if scan fails */ }
        }
        // ─── Inject open tabs context ────────────────────────
        try {
            const openTabs = vscode.window.tabGroups.all
                .flatMap(g => g.tabs)
                .filter(t => t.input && t.input.uri)
                .map(t => {
                const uri = t.input.uri;
                const name = uri.fsPath.split(/[\\/]/).pop() || '';
                const isActive = t.isActive;
                return isActive ? `- ${name} (active)` : `- ${name}`;
            })
                .slice(0, 8);
            if (openTabs.length > 0) {
                prompt += `\n[Open Tabs]\n${openTabs.join('\n')}`;
            }
        }
        catch { /* skip in non-vscode environments */ }
        // ─── Inject active file info ─────────────────────────
        if (this.activeFile) {
            const shortPath = this.workspaceRoot
                ? this.activeFile.replace(this.workspaceRoot, '.').replace(/\\/g, '/')
                : this.activeFile;
            prompt += `\n[Active File: ${shortPath}]`;
        }
        if (this.workspaceRoot) {
            prompt += `\n[Workspace Root: ${this.workspaceRoot}]`;
        }
        // ─── Inject task ledger (memory between tool calls) ──
        if (this.taskLedger.goal && this.mode !== 'chat') {
            prompt += `\n[Task Ledger]\nGoal: ${this.taskLedger.goal}`;
            if (this.taskLedger.filesTouched.length > 0) {
                prompt += `\nFiles touched: ${this.taskLedger.filesTouched.slice(-8).join(', ')}`;
            }
            if (this.taskLedger.lastAction) {
                prompt += `\nLast action: ${this.taskLedger.lastAction}`;
            }
            prompt += `\nSteps completed: ${this.taskLedger.stepCount}`;
        }
        // Inject user context
        if (this.memory) {
            prompt += this.memory.getContextPrompt();
        }
        prompt += this.runtime.buildPromptContext();
        return prompt;
    }
    isActionRequest(text) {
        const lower = text.toLowerCase();
        if (this.isSimpleGreeting(lower)) {
            return false;
        }
        const isAction = ACTION_KEYWORDS.some(kw => lower.includes(kw));
        const isInstructing = lower.includes('you can') || lower.includes('you should') || lower.includes('here\'s how') || lower.includes('step 1');
        return isAction || isInstructing;
    }
    isSimpleGreeting(text) {
        const greetings = ['hi', 'hello', 'hey', 'مرحبا', 'اهلا', 'السلام', 'good morning', 'good evening', 'thanks', 'thank you', 'شكرا', 'ok', 'okay', 'yes', 'no', 'نعم', 'لا'];
        const trimmed = text.trim().replace(/[!?.،,]+$/g, '').trim();
        // Short messages that are just greetings
        return trimmed.split(/\s+/).length <= 4 && greetings.some(g => trimmed === g || trimmed.startsWith(g + ' '));
    }
    // ─── Slash Command Parser ───────────────────────────────
    parseSlashCommand(text) {
        if (!text.startsWith('/')) {
            return null;
        }
        const spaceIdx = text.indexOf(' ');
        if (spaceIdx === -1) {
            return { command: text.substring(1).toLowerCase(), args: '' };
        }
        return {
            command: text.substring(1, spaceIdx).toLowerCase(),
            args: text.substring(spaceIdx + 1).trim(),
        };
    }
    // ─── Main Execution ─────────────────────────────────────
    async *run(userMessage) {
        this.cancelled = false;
        this.running = true;
        try {
            // ── Check for slash commands ────────────────────
            const slashCmd = this.parseSlashCommand(userMessage);
            if (slashCmd) {
                yield* this.handleSlashCommand(slashCmd.command, slashCmd.args);
                return;
            }
            this.runtime.startGoal(userMessage);
            this.taskLedger = { goal: userMessage.substring(0, 200), filesTouched: [], lastAction: '', stepCount: 0 };
            yield { type: 'status', content: 'Goal accepted', runtime: this.runtime.snapshot() };
            this.conversationHistory.push({ role: 'user', content: userMessage });
            if (this.memory) {
                this.memory.getCurrentConversation(this.mode, this.config.model);
                this.memory.addMessage('user', userMessage);
            }
            if ((this.mode === 'agent' || this.mode === 'max') && this.isProjectBootstrapRequest(userMessage)) {
                const confidence = this.assessRequestConfidence(userMessage);
                if (confidence < 0.5) {
                    yield* this.askClarification(userMessage);
                    return;
                }
                yield* this.runDirectProjectBootstrap(userMessage);
                return;
            }
            // ── Mode routing ────────────────────────────────
            // Auto-redirect simple greetings to chat regardless of mode
            const isGreeting = this.isSimpleGreeting(userMessage.toLowerCase());
            if (isGreeting) {
                yield* this.runChatMode();
            }
            else if (this.mode === 'deep' || this.shouldUseDeepMode(userMessage)) {
                yield { type: 'info', content: 'Deep Analysis Mode - exploring codebase first' };
                yield* this.runDeepMode(userMessage);
            }
            else if (this.mode === 'planning') {
                yield { type: 'info', content: 'Planning Mode - building an architecture-aware plan' };
                yield* this.runDeepMode(userMessage);
            }
            else if (this.mode === 'monitor') {
                yield { type: 'response', content: this.formatRuntimeMonitor() };
            }
            else if (this.mode === 'chat') {
                if (this.isActionRequest(userMessage)) {
                    yield { type: 'info', content: 'Switch to Agent, Debug, or Max mode to execute tasks.' };
                }
                yield* this.runChatMode();
            }
            else if (this.mode === 'max') {
                yield { type: 'info', content: 'Max Mode - autonomous execution with validation' };
                yield* this.runAgentMode();
            }
            else {
                const caps = this.getModelCapabilities();
                yield {
                    type: 'info',
                    content: this.mode === 'computer'
                        ? 'Computer Control Mode'
                        : this.mode === 'debug'
                            ? 'Debug Mode - reproduce, patch, validate'
                            : caps.supportsTools ? 'Agent Mode (native tools)' : 'Agent Mode (prompt tools)',
                };
                yield* this.runAgentMode();
            }
        }
        finally {
            this.running = false;
            this.cancelled = false;
        }
    }
    // ─── Deep Analysis Mode ─────────────────────────────────
    isProjectBootstrapRequest(message) {
        const lower = message.toLowerCase();
        const hasAction = [
            'create', 'make', 'build', 'generate', 'scaffold', 'start',
            '\u0627\u0639\u0645\u0644', '\u0627\u0628\u0646\u064a', '\u0627\u0646\u0634\u0626', '\u0627\u0635\u0646\u0639',
        ].some((term) => lower.includes(term));
        const hasArtifact = [
            'website', 'web site', 'web app', 'app', 'project', 'dashboard', 'landing',
            'next.js', 'nextjs', 'react', 'fastapi', 'django', 'flask', 'api',
            '\u0648\u064a\u0628', '\u0645\u0648\u0642\u0639', '\u062a\u0637\u0628\u064a\u0642', '\u0645\u0634\u0631\u0648\u0639',
        ].some((term) => lower.includes(term));
        return hasAction && hasArtifact;
    }
    async *runDirectProjectBootstrap(userMessage) {
        const projectName = this.inferProjectName(userMessage);
        this.runtime.startTask();
        yield { type: 'info', content: `Project generation detected: ${projectName}` };
        yield { type: 'tool_call', content: `project_generate(${JSON.stringify({ projectName, intent: userMessage })})`, toolName: 'project_generate' };
        const result = await this.tools.execute('project_generate', {
            projectName,
            intent: userMessage,
            overwrite: 'false',
        });
        yield { type: 'tool_result', content: (result.success ? 'OK ' : 'FAIL ') + result.output, toolName: 'project_generate' };
        this.conversationHistory.push({ role: 'assistant', content: '[Used project_generate]' });
        this.conversationHistory.push({ role: 'tool', content: `[project_generate] ${result.success ? 'OK' : 'FAIL'}: ${result.output.substring(0, 1200)}` });
        if (!result.success) {
            this.runtime.failTask(result.output.substring(0, 240));
            yield { type: 'error', content: result.output };
            return;
        }
        this.runtime.completeTask('Project files generated');
        this.runtime.createCheckpoint('project-generated', result.output.substring(0, 240));
        const summary = [
            `Generated project "${projectName}".`,
            '',
            result.output,
            '',
            'Next useful step: run the project install/build commands when you are ready.',
        ].join('\n');
        this.conversationHistory.push({ role: 'assistant', content: summary });
        if (this.memory) {
            this.memory.addMessage('assistant', summary);
        }
        yield { type: 'checkpoint', content: 'Project generation checkpoint saved', runtime: this.runtime.snapshot() };
        yield { type: 'response', content: summary };
    }
    inferProjectName(message) {
        const lower = message.toLowerCase();
        const named = lower.match(/(?:called|named|project|app|site)\s+["']?([a-z0-9][a-z0-9._-]{1,50})["']?/i);
        if (named?.[1] && !['with', 'using', 'for', 'that', 'website', 'project'].includes(named[1])) {
            return named[1];
        }
        if (lower.includes('dashboard')) {
            return 'sinter-dashboard';
        }
        if (lower.includes('api')) {
            return 'sinter-api';
        }
        if (lower.includes('landing')) {
            return 'sinter-landing';
        }
        if (lower.includes('website') || lower.includes('web') || lower.includes('\u0648\u064a\u0628') || lower.includes('\u0645\u0648\u0642\u0639')) {
            return 'sinter-website';
        }
        return 'sinter-project';
    }
    assessRequestConfidence(message) {
        const lower = message.toLowerCase();
        let score = 0;
        // Has a project type mentioned?
        if (['react', 'next', 'vue', 'angular', 'fastapi', 'django', 'flask', 'express', 'html', 'landing'].some(t => lower.includes(t))) {
            score += 0.3;
        }
        // Has a name?
        if (/(?:called|named|اسم)\s+\S+/i.test(lower)) {
            score += 0.2;
        }
        // Has descriptive details (more than 8 words)?
        if (lower.split(/\s+/).length > 8) {
            score += 0.2;
        }
        // Has feature keywords?
        if (['login', 'dashboard', 'api', 'form', 'database', 'auth', 'portfolio', 'blog', 'shop', 'store', 'chat', 'dark', 'responsive'].some(f => lower.includes(f))) {
            score += 0.2;
        }
        // Basic action + artifact is minimum
        if (score === 0) {
            score = 0.1;
        }
        return Math.min(score, 1);
    }
    async *askClarification(userMessage) {
        const questions = [
            '🤔 I want to help you build the best project! Could you clarify a few things:',
            '',
            '1. **Project type**: Website, Web App, API, or Full-stack? (React/Next.js/HTML/FastAPI/Express...)',
            '2. **Project name**: What should it be called?',
            '3. **Key features**: What should it include? (e.g., login, dashboard, blog, portfolio, forms)',
            '',
            '💡 Or just add more detail to your request and I\'ll start building immediately!',
            '',
            '_Example: "Create a React portfolio website called my-portfolio with dark theme, projects section, and contact form"_',
        ].join('\n');
        this.conversationHistory.push({ role: 'assistant', content: questions });
        if (this.memory) {
            this.memory.addMessage('assistant', questions);
        }
        yield { type: 'response', content: questions };
    }
    shouldUseDeepMode(message) {
        if (this.mode !== 'agent' && this.mode !== 'max' && this.mode !== 'debug') {
            return false;
        }
        const deepKeywords = [
            'شوف المشروع', 'حلل', 'راجع', 'اعمل خطة', 'حسّن', 'حسن',
            'review', 'analyze', 'audit', 'improve', 'refactor',
            'find issues', 'code review', 'full analysis',
            'explore', 'understand the codebase', 'map the project',
            'what can be improved', 'architecture',
        ];
        const lower = message.toLowerCase();
        return deepKeywords.some(kw => lower.includes(kw));
    }
    async *runDeepMode(userMessage) {
        const reporter = new progressReporter_1.ProgressReporter();
        const explorer = new codebaseExplorer_1.CodebaseExplorer();
        const pipeline = new analysisPipeline_1.AnalysisPipeline();
        const planner = new planBuilder_1.PlanBuilder();
        const workspaceRoot = this.workspaceRoot || '.';
        try {
            this.runtime.setExecutionState('planning');
            yield { type: 'status', content: 'Planning and codebase analysis started', runtime: this.runtime.snapshot() };
            // ═══ Step 1: Explore project ═══
            yield reporter.exploring(workspaceRoot);
            const projectMap = await explorer.fullScan(workspaceRoot, reporter);
            // Show each file read
            for (const file of projectMap.sourceFiles) {
                yield reporter.readingFile(file.relativePath, file.lines);
                if (this.cancelled) {
                    return;
                }
            }
            // ═══ Step 2: Analyze ═══
            yield reporter.analyzingArchitecture();
            const analysis = pipeline.analyze(projectMap);
            yield reporter.foundStats(projectMap.stats.totalSourceFiles, projectMap.stats.totalLines, analysis.suggestions.length);
            // ═══ Step 3: Build plan ═══
            yield reporter.buildingPlan();
            const plan = planner.buildPlan(analysis, userMessage, projectMap);
            // ═══ Step 4: Format and present ═══
            const analysisReport = pipeline.formatAsMarkdown(analysis);
            const planReport = planner.formatAsMarkdown(plan);
            const fullReport = analysisReport + '\n\n---\n\n' + planReport;
            yield reporter.done(`${analysis.suggestions.length} suggestions, ${plan.phases.length} phases`);
            this.runtime.completeTask(`Planned ${plan.phases.length} phases from ${analysis.suggestions.length} findings`);
            this.runtime.createCheckpoint('deep-analysis', `${projectMap.stats.totalSourceFiles} files analyzed`);
            yield { type: 'checkpoint', content: 'Deep analysis checkpoint saved', runtime: this.runtime.snapshot() };
            // Also send to model for a human-readable summary
            const summaryMessages = [
                { role: 'system', content: DEEP_PROMPT },
                { role: 'user', content: userMessage },
                { role: 'assistant', content: `I've analyzed the project. Here are my findings:\n\n${fullReport}` },
                { role: 'user', content: 'Now give me a brief, clear summary of the key findings and your top 3 recommendations based on this analysis. Be concise.' },
            ];
            const summaryResponse = await this.adapter.chat(this.config.model, summaryMessages, [], { temperature: 0.3 });
            yield { type: 'response', content: fullReport + '\n\n---\n\n## 🧠 ملخص الذكاء الاصطناعي\n\n' + summaryResponse.content };
            if (this.memory) {
                this.memory.addMessage('assistant', fullReport);
            }
        }
        catch (e) {
            yield reporter.error(`Deep analysis failed: ${e.message}`);
            // Fallback to regular agent mode
            yield { type: 'info', content: '⚠️ Falling back to regular agent mode...' };
            yield* this.runAgentMode();
        }
    }
    // ─── Slash Command Handler ──────────────────────────────
    async *handleSlashCommand(cmd, args) {
        switch (cmd) {
            case 'help':
                yield { type: 'response', content: this.getHelpText() };
                return;
            case 'clear':
                this.clearHistory();
                yield { type: 'info', content: '🗑️ Chat cleared' };
                return;
            case 'screenshot':
                yield { type: 'info', content: '📸 Taking screenshot...' };
                try {
                    const result = await this.tools.execute('computer_screenshot', {});
                    if (result.images && result.images.length > 0) {
                        yield { type: 'images', content: 'Screenshot', images: result.images };
                    }
                    yield { type: 'tool_result', content: result.success ? `✅ ${result.output}` : `❌ ${result.output}` };
                }
                catch (e) {
                    yield { type: 'error', content: `Screenshot failed: ${e.message}` };
                }
                return;
            case 'run':
                if (!args) {
                    yield { type: 'error', content: 'Usage: /run <command>' };
                    return;
                }
                yield { type: 'info', content: `💻 Running: ${args}` };
                try {
                    const result = await this.tools.execute('terminal_run', { command: args });
                    yield { type: 'tool_result', content: result.success ? `✅ ${result.output}` : `❌ ${result.output}` };
                }
                catch (e) {
                    yield { type: 'error', content: `Command failed: ${e.message}` };
                }
                return;
            case 'search':
                if (!args) {
                    yield { type: 'error', content: 'Usage: /search <query>' };
                    return;
                }
                yield { type: 'info', content: `🔍 Searching: ${args}` };
                try {
                    const result = await this.tools.execute('browser_search', { query: args });
                    yield { type: 'tool_result', content: result.success ? `✅ ${result.output}` : `❌ ${result.output}` };
                }
                catch (e) {
                    yield { type: 'error', content: `Search failed: ${e.message}` };
                }
                return;
            case 'open':
                if (!args) {
                    yield { type: 'error', content: 'Usage: /open <url or app>' };
                    return;
                }
                yield { type: 'info', content: `🌐 Opening: ${args}` };
                try {
                    if (args.startsWith('http')) {
                        const result = await this.tools.execute('browser_open', { url: args });
                        yield { type: 'tool_result', content: result.success ? `✅ ${result.output}` : `❌ ${result.output}` };
                    }
                    else {
                        const result = await this.tools.execute('computer_open_app', { target: args });
                        yield { type: 'tool_result', content: result.success ? `✅ ${result.output}` : `❌ ${result.output}` };
                    }
                }
                catch (e) {
                    yield { type: 'error', content: `Open failed: ${e.message}` };
                }
                return;
            case 'file':
                if (!args) {
                    yield { type: 'error', content: 'Usage: /file read <path> or /file list <dir>' };
                    return;
                }
                const [fileCmd, ...fileParts] = args.split(' ');
                const filePath = fileParts.join(' ') || '.';
                try {
                    if (fileCmd === 'read') {
                        const result = await this.tools.execute('file_read', { path: filePath });
                        yield { type: 'tool_result', content: result.success ? result.output.substring(0, 2000) : `❌ ${result.output}` };
                    }
                    else if (fileCmd === 'list') {
                        const result = await this.tools.execute('file_list', { path: filePath });
                        yield { type: 'tool_result', content: result.success ? `✅ ${result.output}` : `❌ ${result.output}` };
                    }
                    else {
                        yield { type: 'error', content: 'Usage: /file read <path> or /file list <dir>' };
                    }
                }
                catch (e) {
                    yield { type: 'error', content: `File operation failed: ${e.message}` };
                }
                return;
            case 'code':
                if (!args) {
                    yield { type: 'error', content: 'Usage: /code <description>' };
                    return;
                }
                // Route to agent mode for code generation
                this.conversationHistory.push({ role: 'user', content: `Create code: ${args}` });
                if (this.memory) {
                    this.memory.addMessage('user', `/code ${args}`);
                }
                const prevMode = this.mode;
                this.mode = 'agent';
                yield { type: 'info', content: '🔨 Generating code...' };
                yield* this.runAgentMode();
                this.mode = prevMode;
                return;
            case 'project':
                if (!args) {
                    yield { type: 'error', content: 'Usage: /project <name or description>' };
                    return;
                }
                this.runtime.startGoal(args);
                this.conversationHistory.push({ role: 'user', content: `Create project: ${args}` });
                if (this.memory) {
                    this.memory.addMessage('user', `/project ${args}`);
                }
                yield* this.runDirectProjectBootstrap(args);
                return;
            case 'fix':
                // Fix current file
                if (this.activeFile) {
                    const fixMsg = `Fix the errors in file: ${this.activeFile}${args ? '. Details: ' + args : ''}`;
                    this.conversationHistory.push({ role: 'user', content: fixMsg });
                    if (this.memory) {
                        this.memory.addMessage('user', `/fix ${this.activeFile}`);
                    }
                    const pm = this.mode;
                    this.mode = 'agent';
                    yield { type: 'info', content: `🔧 Fixing: ${this.activeFile}` };
                    yield* this.runAgentMode();
                    this.mode = pm;
                }
                else {
                    yield { type: 'error', content: '⚠️ No active file. Open a file first.' };
                }
                return;
            case 'explain':
                if (this.activeFile) {
                    const explainMsg = `Explain this code from ${this.activeFile}${args ? ': ' + args : ''}`;
                    this.conversationHistory.push({ role: 'user', content: explainMsg });
                    if (this.memory) {
                        this.memory.addMessage('user', `/explain ${this.activeFile}`);
                    }
                    yield* this.runChatMode();
                }
                else {
                    yield { type: 'error', content: '⚠️ No active file. Open a file first.' };
                }
                return;
            default:
                yield { type: 'error', content: `Unknown command: /${cmd}\nType /help for available commands.` };
                return;
        }
    }
    getHelpText() {
        return `⚡ **Sinter AI Commands**

/code <desc> — Generate code
/project <name or desc> — Generate a complete project
/fix — Fix errors in current file
/explain — Explain current file
/run <cmd> — Run terminal command
/search <query> — Search the web
/screenshot — Take screenshot
/file read <path> — Read a file
/file list <dir> — List directory
/open <url|app> — Open URL or app
/clear — Clear chat
/help — Show this help

**Modes:**
💬 Chat — Conversation
🤖 Agent — Execute tasks
🖥️ Computer — Desktop control
⚡ Max — Auto-detect best mode`;
    }
    // ─── Chat Mode ──────────────────────────────────────────
    async *runChatMode() {
        if (this.cancelled) {
            yield { type: 'info', content: '⏹️ Stopped' };
            return;
        }
        yield { type: 'thinking', content: 'Thinking...' };
        try {
            const messages = [
                { role: 'system', content: this.getSystemPrompt() },
                ...this.getRecentHistory(20),
            ];
            if (this.activeFileContent && this.activeFile) {
                const scopedContent = this.compressor.scopedFileContext(this.activeFile, this.activeFileContent, 6000);
                messages.splice(1, 0, {
                    role: 'system',
                    content: `[Current file: ${this.activeFile}]\n\`\`\`\n${scopedContent}\n\`\`\``,
                });
            }
            const fallbackEvents = [];
            // Only pass tools if the user's message is actionable — NOT for greetings
            // This prevents models (phi3, deepseek-coder) from outputting raw JSON tool calls for "hi"
            const lastUserMsg = this.conversationHistory.filter(m => m.role === 'user').pop()?.content || '';
            const shouldPassTools = !this.isSimpleGreeting(lastUserMsg.toLowerCase()) && this.isActionRequest(lastUserMsg);
            const adapted = await this.adapter.chatWithFallback(this.config.model, messages, shouldPassTools ? this.tools.toOllamaTools() : [], { temperature: 0.7, num_predict: 2048 }, (msg) => { fallbackEvents.push({ type: 'info', content: msg }); });
            for (const fe of fallbackEvents)
                yield fe;
            if (adapted.providerUsed) {
                yield { type: 'info', content: `🔌 ${adapted.providerUsed} → ${adapted.modelUsed || ''}${adapted.isOnline ? ' 🌐' : ' 💻'}` };
            }
            if (this.cancelled) {
                yield { type: 'info', content: '⏹️ Stopped' };
                return;
            }
            if (adapted.isToolResponse && adapted.toolCalls.length > 0) {
                // If model wants to act in chat mode, let's do it once then finish
                for (const tc of adapted.toolCalls) {
                    yield { type: 'tool_call', content: `Calling ${tc.name}...`, toolName: tc.name };
                    const result = await this.tools.execute(tc.name, tc.arguments);
                    yield { type: 'tool_result', content: result.success ? `✅ ${result.output.substring(0, 500)}` : `❌ ${result.output}` };
                    this.conversationHistory.push({ role: 'assistant', content: adapted.content });
                    this.conversationHistory.push({ role: 'user', content: `Tool Result (${tc.name}): ${JSON.stringify(result)}` });
                }
                // Final summary
                const summary = await this.adapter.chatWithFallback(this.config.model, [{ role: 'system', content: this.getSystemPrompt() }, ...this.getRecentHistory(10)], [], { temperature: 0.3 });
                yield { type: 'response', content: summary.content };
                if (this.memory)
                    this.memory.addMessage('assistant', summary.content);
            }
            else {
                this.conversationHistory.push({ role: 'assistant', content: adapted.content });
                if (this.memory) {
                    this.memory.addMessage('assistant', adapted.content);
                }
                yield { type: 'response', content: adapted.content };
            }
        }
        catch (error) {
            yield* this.handleConnectionError(error instanceof Error ? error.message : String(error));
        }
    }
    // ─── Agent Mode (Multi-Step) ─────────────────────────────
    async *runAgentMode() {
        const usedTools = [];
        let successCount = 0;
        let consecutiveNoTool = 0;
        let retryCount = 0;
        const MAX_RETRIES = 2;
        const effectiveMax = this.mode === 'max' ? 30 : (this.mode === 'agent' || this.mode === 'deep' || this.mode === 'debug') ? 20 : this.config.maxIterations;
        this.runtime.startTask();
        yield { type: 'status', content: `Execution started (max ${effectiveMax} steps)`, runtime: this.runtime.snapshot() };
        for (let i = 0; i < effectiveMax; i++) {
            if (this.cancelled) {
                yield { type: 'info', content: '⏹️ Stopped' };
                return;
            }
            yield { type: 'thinking', content: successCount > 0 ? `Step ${i + 1} (${successCount} tools used)...` : `Step ${i + 1}...` };
            try {
                const messages = [
                    { role: 'system', content: this.getSystemPrompt() },
                    ...this.getRecentHistory(16),
                ];
                if (this.activeFileContent && this.activeFile) {
                    const scopedContent = this.compressor.scopedFileContext(this.activeFile, this.activeFileContent, 5000);
                    messages.splice(1, 0, {
                        role: 'system',
                        content: `[Active file: ${this.activeFile}]\n\`\`\`\n${scopedContent}\n\`\`\``,
                    });
                }
                // If tools have been used, remind the model to continue or finish
                if (successCount > 0) {
                    messages.push({
                        role: 'system',
                        content: 'Previous tools executed successfully. If the task is COMPLETE, respond with a final summary (no tool call). If MORE steps are needed, call the next tool.',
                    });
                }
                // Use fallback chain if configured, otherwise direct Ollama
                const fallbackEvents = [];
                const adapted = await this.adapter.chatWithFallback(this.config.model, messages, this.tools.toOllamaTools(), { temperature: 0.2, num_predict: 1024 }, (msg) => { fallbackEvents.push({ type: 'info', content: msg }); });
                // Emit fallback events
                for (const fe of fallbackEvents) {
                    yield fe;
                }
                // Show which provider/model responded
                if (adapted.providerUsed) {
                    yield { type: 'info', content: `🔌 ${adapted.providerUsed} → ${adapted.modelUsed || ''}${adapted.isOnline ? ' 🌐' : ' 💻'}` };
                }
                if (this.cancelled) {
                    yield { type: 'info', content: '⏹️ Stopped' };
                    return;
                }
                if (!adapted.content && (!adapted.toolCalls || adapted.toolCalls.length === 0)) {
                    yield { type: 'info', content: '⚠️ Model gave empty response. Retrying with simpler prompt...' };
                    consecutiveNoTool++;
                    continue;
                }
                if (adapted.isToolResponse && adapted.toolCalls.length > 0) {
                    consecutiveNoTool = 0;
                    retryCount = 0;
                    for (const tc of adapted.toolCalls) {
                        if (this.cancelled) {
                            yield { type: 'info', content: '⏹️ Stopped' };
                            return;
                        }
                        const sig = `${tc.name}:${JSON.stringify(tc.arguments)}`;
                        if (this.runtime.detectLoop(sig)) {
                            this.runtime.markRetry('change tool arguments or choose a different execution path');
                            this.runtime.recordFailure(this.runtime.currentTask()?.id || 'task', sig, 'Repeated tool signature detected', 'change arguments/tool/path');
                            yield { type: 'reflection', content: 'Loop detected. Changing strategy before retry.', runtime: this.runtime.snapshot() };
                            continue;
                        }
                        if (usedTools.includes(sig)) {
                            yield { type: 'info', content: 'Skipping duplicate tool call' };
                            continue;
                        }
                        usedTools.push(sig);
                        yield { type: 'tool_call', content: `${tc.name}(${JSON.stringify(tc.arguments)})`, toolName: tc.name };
                        let result;
                        try {
                            result = await this.tools.execute(tc.name, tc.arguments);
                        }
                        catch (e) {
                            result = { success: false, output: `Error: ${e.message}` };
                        }
                        if (result.images?.length) {
                            yield { type: 'images', content: 'Screenshot', images: result.images };
                        }
                        yield { type: 'tool_result', content: (result.success ? '✅ ' : '❌ ') + result.output.substring(0, 1000), toolName: tc.name };
                        // ─── Update task ledger ─────────────────
                        this.taskLedger.stepCount++;
                        this.taskLedger.lastAction = `${tc.name} ${result.success ? 'OK' : 'FAIL'}`;
                        // Track files touched
                        const filePath = String(tc.arguments.path || tc.arguments.filename || '');
                        if (filePath && !this.taskLedger.filesTouched.includes(filePath)) {
                            this.taskLedger.filesTouched.push(filePath);
                        }
                        // Invalidate workspace map cache after file mutations
                        if (this.isMutationTool(tc.name)) {
                            (0, workspaceMap_1.invalidateWorkspaceMap)();
                        }
                        this.conversationHistory.push({ role: 'assistant', content: `[Used ${tc.name}]` });
                        this.conversationHistory.push({ role: 'tool', content: `[${tc.name}] ${result.success ? 'OK' : 'FAIL'}: ${result.output.substring(0, 800)}` });
                        if (this.memory) {
                            this.memory.addMessage('assistant', `[Tool: ${tc.name}] ${result.success ? '✅' : '❌'} ${result.output.substring(0, 200)}`);
                        }
                        if (result.success) {
                            successCount++;
                            if (this.isMutationTool(tc.name)) {
                                yield* this.runValidationAfterMutation(sig);
                            }
                        }
                        else {
                            const currentTaskId = this.runtime.currentTask()?.id || 'task';
                            this.runtime.recordFailure(currentTaskId, sig, result.output.substring(0, 300), 'inspect error, reduce scope, and retry with a different command or edit');
                            this.runtime.markRetry('tool failed; use a different strategy');
                            yield { type: 'status', content: 'Tool failed; retry strategy recorded', runtime: this.runtime.snapshot() };
                        }
                    }
                    // DON'T stop after first success — continue the loop so the model
                    // can decide if more tools are needed. Only break for vision loops
                    // to prevent infinite screenshot→click→screenshot cycles.
                    if (this.isVisionLoop(usedTools) && successCount >= 5) {
                        yield { type: 'info', content: '🔄 Vision loop detected — generating summary' };
                        yield* this.generateSummary();
                        return;
                    }
                    continue;
                }
                // Model returned text (no tool call)
                const final = adapted.content || '(no response)';
                // If no tools have been used yet and the model just responded with text,
                // only retry if the ORIGINAL user message was actionable (not just a greeting)
                const originalUserMsg = this.conversationHistory.find(m => m.role === 'user')?.content || '';
                if (successCount === 0 && retryCount < MAX_RETRIES && this.isActionRequest(originalUserMsg) && this.isActionRequest(final)) {
                    retryCount++;
                    this.conversationHistory.push({
                        role: 'user',
                        content: 'Do NOT explain. USE your tools to actually do this task. Respond with the tool JSON only.',
                    });
                    yield { type: 'info', content: `🔄 Retry ${retryCount}/${MAX_RETRIES} — pushing for tool use...` };
                    continue;
                }
                // If tools were used and pending tasks remain, push to continue
                const hasPending = this.runtime.snapshot().pending > 0;
                if (successCount > 0 && hasPending && retryCount < 1) {
                    retryCount++;
                    this.conversationHistory.push({ role: 'assistant', content: final });
                    this.conversationHistory.push({
                        role: 'user',
                        content: 'Good progress. There are still pending tasks. Continue executing the next step using tools.',
                    });
                    yield { type: 'info', content: '➡️ Tasks pending — continuing execution...' };
                    continue;
                }
                this.conversationHistory.push({ role: 'assistant', content: final });
                if (this.memory) {
                    this.memory.addMessage('assistant', final);
                }
                this.runtime.completeTask('Model reported completion');
                this.runtime.createCheckpoint('goal-complete', final.substring(0, 240));
                yield { type: 'checkpoint', content: 'Goal checkpoint saved', runtime: this.runtime.snapshot() };
                yield { type: 'response', content: final };
                return;
            }
            catch (error) {
                const em = error instanceof Error ? error.message : String(error);
                // Connection-level failures — stop immediately, don't retry
                if (em.includes('ECONNREFUSED') || em.includes('All providers failed')) {
                    yield* this.handleConnectionError(em);
                    return;
                }
                yield { type: 'error', content: em };
                this.conversationHistory.push({ role: 'tool', content: `ERROR: ${em}` });
                const currentTaskId = this.runtime.currentTask()?.id || 'task';
                this.runtime.recordFailure(currentTaskId, `iteration:${i}`, em, 'fallback to smaller context or alternate tool route');
                this.runtime.markRetry('runtime error; fallback strategy recorded');
                if (i > 2 && this.conversationHistory.slice(-4).filter(m => m.content.startsWith('ERROR:')).length >= 2) {
                    yield { type: 'info', content: '⚠️ Falling back to chat...' };
                    yield* this.runChatMode();
                    return;
                }
            }
        }
        // Reached max iterations — generate a summary of what was done
        if (successCount > 0) {
            yield* this.generateSummary();
        }
        else {
            this.runtime.failTask(`Max steps (${this.config.maxIterations}) reached without completion`);
            yield { type: 'error', content: `⚠️ Max steps (${this.config.maxIterations}) reached without completing the task.` };
        }
    }
    // ─── Generate Summary ─────────────────────────────────────
    async *generateSummary() {
        yield { type: 'thinking', content: 'Summarizing...' };
        try {
            const sr = await this.adapter.chatWithFallback(this.config.model, [
                { role: 'system', content: 'Give a SHORT 1-3 sentence summary of what was accomplished. No tools, no JSON. Be concise.' },
                ...this.getRecentHistory(8),
            ], [], { temperature: 0.5, num_predict: 256 });
            if (this.cancelled) {
                yield { type: 'info', content: '⏹️ Stopped' };
                return;
            }
            const s = sr.content || 'Done.';
            this.conversationHistory.push({ role: 'assistant', content: s });
            if (this.memory) {
                this.memory.addMessage('assistant', s);
            }
            this.runtime.completeTask('Execution summarized');
            this.runtime.createCheckpoint('summary', s.substring(0, 240));
            yield { type: 'checkpoint', content: 'Summary checkpoint saved', runtime: this.runtime.snapshot() };
            yield { type: 'response', content: s };
        }
        catch {
            yield { type: 'response', content: 'Done.' };
        }
    }
    async *runValidationAfterMutation(signature) {
        if (!this.validationRunner) {
            return;
        }
        this.runtime.markValidating();
        yield { type: 'validation', content: 'Validation started', runtime: this.runtime.snapshot() };
        const report = await this.validationRunner.run();
        const summary = this.formatValidationSummary(report);
        yield { type: 'validation', content: summary, validation: report, runtime: this.runtime.snapshot() };
        this.conversationHistory.push({ role: 'tool', content: `[validation] ${report.success ? 'OK' : 'FAIL'}: ${summary}` });
        if (report.success) {
            this.runtime.completeTask(report.summary);
            this.runtime.createCheckpoint('validation-pass', report.summary);
            yield { type: 'checkpoint', content: 'Validation checkpoint saved', runtime: this.runtime.snapshot() };
            return;
        }
        const failed = report.checks.find((check) => !check.success);
        const taskId = this.runtime.currentTask()?.id || 'task';
        this.runtime.recordFailure(taskId, `validation:${signature}`, failed?.output.substring(0, 500) || report.summary, 'read validation output, patch the exact failing owner, then rerun validation');
        this.runtime.markRetry('validation failed; repair with scoped edit');
        yield { type: 'reflection', content: 'Validation failed. The next step must repair the failing check with a scoped change.', runtime: this.runtime.snapshot() };
    }
    isMutationTool(toolName) {
        return toolName === 'file_write'
            || toolName === 'file_delete'
            || toolName === 'code_create_file'
            || toolName === 'file_replace'
            || toolName === 'file_insert'
            || toolName === 'file_patch';
    }
    formatValidationSummary(report) {
        if (report.skipped) {
            return report.summary;
        }
        const rows = report.checks.map((check) => `${check.success ? 'PASS' : 'FAIL'} ${check.name} (${Math.round(check.durationMs / 1000)}s): ${check.command}`);
        return `${report.summary}\n${rows.join('\n')}`;
    }
    formatRuntimeMonitor() {
        const state = this.runtime.snapshot();
        const taskLines = state.tasks.length
            ? state.tasks.map((task) => `- [${task.status}] ${task.title} (attempts: ${task.attempts})`).join('\n')
            : '- No active tasks';
        const failureLines = state.failures.length
            ? state.failures.slice(-5).map((failure) => `- ${failure.signature}: ${failure.message}`).join('\n')
            : '- No recorded failures';
        return [
            '# Runtime Monitor',
            '',
            `Goal: ${state.goal || 'No active goal'}`,
            `State: ${state.executionState}`,
            `Progress: ${state.progress}%`,
            `Tasks: ${state.completed} completed, ${state.pending} pending/running, ${state.failed} failed`,
            `Retries: ${state.retryCount}`,
            '',
            '## Task Queue',
            taskLines,
            '',
            '## Failure Memory',
            failureLines,
            '',
            `Checkpoints: ${state.checkpoints.length}`,
        ].join('\n');
    }
    isVisionLoop(tools) {
        const r = tools.slice(-3);
        return r.some(t => t.startsWith('computer_screenshot')) && r.some(t => t.startsWith('computer_mouse') || t.startsWith('computer_keyboard'));
    }
    getRecentHistory(max) {
        return this.compressor.compress(this.conversationHistory, max, 28000).messages;
    }
    async *handleConnectionError(errorDetail) {
        // Show the actual error details so the user knows what went wrong
        const isProviderChainError = errorDetail.includes('All providers failed');
        const isOllamaDown = errorDetail.includes('ECONNREFUSED');
        let message = '⚠️ Connection Error\n\n';
        if (isProviderChainError) {
            message += errorDetail + '\n';
        }
        else if (isOllamaDown) {
            message += 'Cannot connect to Ollama!\n';
            message += '1. Open terminal\n';
            message += '2. Run: ollama serve\n';
            message += '3. Try again\n';
        }
        else {
            message += errorDetail + '\n';
        }
        yield { type: 'error', content: message };
    }
    clearHistory() {
        this.conversationHistory = [];
        if (this.memory) {
            this.memory.newConversation(this.mode, this.config.model);
        }
    }
    loadConversation(id) {
        if (!this.memory) {
            return false;
        }
        const conv = this.memory.switchConversation(id);
        if (conv) {
            this.conversationHistory = conv.messages.map(m => ({ role: m.role, content: m.content }));
            return true;
        }
        return false;
    }
}
exports.AgentLoop = AgentLoop;
//# sourceMappingURL=agentLoop.js.map