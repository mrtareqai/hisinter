// ═══════════════════════════════════════════════════════════════
// Sinter AI — Progress Reporter ⭐
// Displays beautiful live progress events during deep analysis
// Modeled after professional AI assistant workflows
// ═══════════════════════════════════════════════════════════════

import { AgentEvent } from './agentLoop';

export class ProgressReporter {
    private stepCount = 0;

    private emit(content: string, type: AgentEvent['type'] = 'info'): AgentEvent {
        this.stepCount++;
        return { type, content };
    }

    // ─── Exploration Phase ──────────────────────────────────
    exploring(path: string): AgentEvent {
        const short = path.length > 40 ? '...' + path.slice(-37) : path;
        return this.emit(`📁 Exploring workspace: ${short}`);
    }

    foundStructure(dirs: number, files: number): AgentEvent {
        return this.emit(`📂 Found ${dirs} directories, ${files} files`);
    }

    // ─── Reading Phase ──────────────────────────────────────
    readingFile(file: string, lines: number): AgentEvent {
        const basename = file.split(/[\\/]/).pop() || file;
        return this.emit(`📄 Analyzing ${basename} (${lines} lines)...`);
    }

    readingConfig(file: string): AgentEvent {
        const basename = file.split(/[\\/]/).pop() || file;
        return this.emit(`⚙️ Reading config: ${basename}`);
    }

    // ─── Analysis Phase ─────────────────────────────────────
    analyzingArchitecture(): AgentEvent {
        return this.emit('🧠 Analyzing architecture & dependencies...');
    }

    buildingDependencyGraph(): AgentEvent {
        return this.emit('🔗 Building dependency graph...');
    }

    analyzingPatterns(): AgentEvent {
        return this.emit('🔍 Detecting code patterns & anti-patterns...');
    }

    // ─── Stats Phase ────────────────────────────────────────
    foundStats(files: number, lines: number, issues: number): AgentEvent {
        return this.emit(`📊 Scanned: ${files} files, ${lines} lines, ${issues} issues found`);
    }

    // ─── Planning Phase ─────────────────────────────────────
    buildingPlan(): AgentEvent {
        return this.emit('📋 Creating structured improvement plan...');
    }

    planPhase(phase: number, name: string): AgentEvent {
        return this.emit(`📋 Phase ${phase}: ${name}`);
    }

    // ─── Execution Phase ────────────────────────────────────
    executingStep(step: string): AgentEvent {
        return this.emit(`⚡ Executing: ${step}`);
    }

    creatingFile(path: string): AgentEvent {
        const basename = path.split(/[\\/]/).pop() || path;
        return this.emit(`✏️ Creating: ${basename}`);
    }

    modifyingFile(path: string): AgentEvent {
        const basename = path.split(/[\\/]/).pop() || path;
        return this.emit(`🔧 Modifying: ${basename}`);
    }

    // ─── Verification Phase ─────────────────────────────────
    verifying(what: string): AgentEvent {
        return this.emit(`✅ Verifying: ${what}`);
    }

    // ─── Completion ─────────────────────────────────────────
    done(summary: string): AgentEvent {
        return this.emit(`🎯 Done! ${summary} (${this.stepCount} steps)`);
    }

    error(message: string): AgentEvent {
        return this.emit(`❌ ${message}`, 'error');
    }

    // ─── Thinking indicators ────────────────────────────────
    thinking(message: string): AgentEvent {
        return { type: 'thinking', content: message };
    }

    getStepCount(): number {
        return this.stepCount;
    }
}
