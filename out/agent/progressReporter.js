"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Progress Reporter ⭐
// Displays beautiful live progress events during deep analysis
// Modeled after professional AI assistant workflows
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressReporter = void 0;
class ProgressReporter {
    stepCount = 0;
    emit(content, type = 'info') {
        this.stepCount++;
        return { type, content };
    }
    // ─── Exploration Phase ──────────────────────────────────
    exploring(path) {
        const short = path.length > 40 ? '...' + path.slice(-37) : path;
        return this.emit(`📁 Exploring workspace: ${short}`);
    }
    foundStructure(dirs, files) {
        return this.emit(`📂 Found ${dirs} directories, ${files} files`);
    }
    // ─── Reading Phase ──────────────────────────────────────
    readingFile(file, lines) {
        const basename = file.split(/[\\/]/).pop() || file;
        return this.emit(`📄 Analyzing ${basename} (${lines} lines)...`);
    }
    readingConfig(file) {
        const basename = file.split(/[\\/]/).pop() || file;
        return this.emit(`⚙️ Reading config: ${basename}`);
    }
    // ─── Analysis Phase ─────────────────────────────────────
    analyzingArchitecture() {
        return this.emit('🧠 Analyzing architecture & dependencies...');
    }
    buildingDependencyGraph() {
        return this.emit('🔗 Building dependency graph...');
    }
    analyzingPatterns() {
        return this.emit('🔍 Detecting code patterns & anti-patterns...');
    }
    // ─── Stats Phase ────────────────────────────────────────
    foundStats(files, lines, issues) {
        return this.emit(`📊 Scanned: ${files} files, ${lines} lines, ${issues} issues found`);
    }
    // ─── Planning Phase ─────────────────────────────────────
    buildingPlan() {
        return this.emit('📋 Creating structured improvement plan...');
    }
    planPhase(phase, name) {
        return this.emit(`📋 Phase ${phase}: ${name}`);
    }
    // ─── Execution Phase ────────────────────────────────────
    executingStep(step) {
        return this.emit(`⚡ Executing: ${step}`);
    }
    creatingFile(path) {
        const basename = path.split(/[\\/]/).pop() || path;
        return this.emit(`✏️ Creating: ${basename}`);
    }
    modifyingFile(path) {
        const basename = path.split(/[\\/]/).pop() || path;
        return this.emit(`🔧 Modifying: ${basename}`);
    }
    // ─── Verification Phase ─────────────────────────────────
    verifying(what) {
        return this.emit(`✅ Verifying: ${what}`);
    }
    // ─── Completion ─────────────────────────────────────────
    done(summary) {
        return this.emit(`🎯 Done! ${summary} (${this.stepCount} steps)`);
    }
    error(message) {
        return this.emit(`❌ ${message}`, 'error');
    }
    // ─── Thinking indicators ────────────────────────────────
    thinking(message) {
        return { type: 'thinking', content: message };
    }
    getStepCount() {
        return this.stepCount;
    }
}
exports.ProgressReporter = ProgressReporter;
//# sourceMappingURL=progressReporter.js.map