// ═══════════════════════════════════════════════════════════════
// Sinter AI — Plan Builder ⭐
// Builds structured execution plans from analysis results
// Creates phased implementation plans like a professional
// ═══════════════════════════════════════════════════════════════

import { AnalysisResult, Suggestion } from './analysisPipeline';
import { ProjectMap } from './codebaseExplorer';

// ─── Types ──────────────────────────────────────────────────

export interface Step {
    action: 'create' | 'modify' | 'delete' | 'run' | 'verify';
    target: string;
    description: string;
}

export interface Phase {
    number: number;
    name: string;
    description: string;
    steps: Step[];
    dependencies: number[];
    estimatedEffort: string;
}

export interface FileChange {
    path: string;
    action: 'new' | 'modify' | 'delete';
    summary: string;
}

export interface ExecutionPlan {
    title: string;
    summary: string;
    phases: Phase[];
    filesAffected: FileChange[];
    totalEstimatedTime: string;
    risks: string[];
}

// ─── Plan Builder ───────────────────────────────────────────

export class PlanBuilder {

    /** Build a plan from analysis + user goal */
    buildPlan(analysis: AnalysisResult, userGoal: string, projectMap: ProjectMap): ExecutionPlan {
        const phases: Phase[] = [];
        const filesAffected: FileChange[] = [];
        const risks: string[] = [];

        // Group suggestions by area
        const byArea = new Map<string, Suggestion[]>();
        for (const s of analysis.suggestions) {
            const list = byArea.get(s.area) || [];
            list.push(s);
            byArea.set(s.area, list);
        }

        let phaseNum = 1;

        // Phase 1: Critical fixes
        const criticals = analysis.suggestions.filter(s => s.priority === 'critical');
        if (criticals.length > 0) {
            phases.push({
                number: phaseNum++,
                name: 'إصلاحات حرجة',
                description: 'إصلاح المشاكل الحرجة التي قد تسبب أعطال',
                steps: criticals.map(s => ({
                    action: 'modify' as const,
                    target: s.file,
                    description: s.description,
                })),
                dependencies: [],
                estimatedEffort: this.sumEffort(criticals),
            });
            for (const s of criticals) {
                if (s.file) { filesAffected.push({ path: s.file, action: 'modify', summary: s.title }); }
            }
            risks.push('المشاكل الحرجة قد تؤثر على استقرار المشروع إذا لم تُعالج');
        }

        // Phase 2: High priority improvements
        const highs = analysis.suggestions.filter(s => s.priority === 'high');
        if (highs.length > 0) {
            phases.push({
                number: phaseNum++,
                name: 'تحسينات عالية الأولوية',
                description: 'معالجة المشاكل المهمة التي تؤثر على جودة الكود',
                steps: highs.map(s => ({
                    action: 'modify' as const,
                    target: s.file,
                    description: s.description,
                })),
                dependencies: criticals.length > 0 ? [1] : [],
                estimatedEffort: this.sumEffort(highs),
            });
            for (const s of highs) {
                if (s.file && !filesAffected.some(f => f.path === s.file)) {
                    filesAffected.push({ path: s.file, action: 'modify', summary: s.title });
                }
            }
        }

        // Phase 3: Architecture improvements
        const archSuggestions = analysis.suggestions.filter(s => s.area === 'architecture');
        if (archSuggestions.length > 0) {
            phases.push({
                number: phaseNum++,
                name: 'تحسينات البنية المعمارية',
                description: 'إعادة هيكلة الملفات الكبيرة وفصل المسؤوليات',
                steps: archSuggestions.map(s => ({
                    action: 'modify' as const,
                    target: s.file,
                    description: s.description,
                })),
                dependencies: phases.length > 0 ? [phases.length] : [],
                estimatedEffort: this.sumEffort(archSuggestions),
            });
            risks.push('إعادة الهيكلة قد تكسر بعض الوظائف — يجب الاختبار جيداً');
        }

        // Phase 4: Quality improvements
        const qualitySuggestions = analysis.suggestions.filter(s =>
            s.area === 'quality' || s.area === 'code-quality'
        );
        if (qualitySuggestions.length > 0) {
            phases.push({
                number: phaseNum++,
                name: 'تحسينات الجودة',
                description: 'إضافة اختبارات ومعالجة TODO/FIXME',
                steps: qualitySuggestions.map(s => ({
                    action: s.area === 'quality' ? 'create' as const : 'modify' as const,
                    target: s.file || 'tests/',
                    description: s.description,
                })),
                dependencies: [],
                estimatedEffort: this.sumEffort(qualitySuggestions),
            });
        }

        // Phase 5: Low priority polish
        const lows = analysis.suggestions.filter(s => s.priority === 'low');
        if (lows.length > 0) {
            phases.push({
                number: phaseNum++,
                name: 'تحسينات إضافية',
                description: 'تحسينات صغيرة ولمسات نهائية',
                steps: lows.map(s => ({
                    action: 'modify' as const,
                    target: s.file,
                    description: s.description,
                })),
                dependencies: [],
                estimatedEffort: this.sumEffort(lows),
            });
        }

        // Calculate total time
        const totalMinutes = analysis.suggestions.reduce((sum, s) => {
            return sum + this.parseEffortMinutes(s.estimatedEffort);
        }, 0);

        return {
            title: userGoal || `خطة تحسين ${analysis.projectName}`,
            summary: `خطة من ${phases.length} مراحل لتحسين المشروع بناءً على ${analysis.suggestions.length} اقتراح.`,
            phases,
            filesAffected,
            totalEstimatedTime: this.formatMinutes(totalMinutes),
            risks,
        };
    }

    /** Format plan as Markdown */
    formatAsMarkdown(plan: ExecutionPlan): string {
        const lines: string[] = [];

        lines.push(`# 📋 ${plan.title}\n`);
        lines.push(plan.summary + '\n');
        lines.push(`⏱️ الوقت المقدر: **${plan.totalEstimatedTime}**\n`);

        // Phases
        for (const phase of plan.phases) {
            lines.push(`## المرحلة ${phase.number}: ${phase.name}\n`);
            lines.push(`> ${phase.description}`);
            lines.push(`> ⏱️ ${phase.estimatedEffort}\n`);

            if (phase.dependencies.length > 0) {
                lines.push(`> ⚠️ تعتمد على: المرحلة ${phase.dependencies.join(', ')}\n`);
            }

            for (const step of phase.steps) {
                const icon = step.action === 'create' ? '✏️' : step.action === 'modify' ? '🔧' : step.action === 'delete' ? '🗑️' : step.action === 'run' ? '💻' : '✅';
                lines.push(`- ${icon} **[${step.action.toUpperCase()}]** \`${step.target}\`: ${step.description}`);
            }
            lines.push('');
        }

        // Files affected
        if (plan.filesAffected.length > 0) {
            lines.push('## 📁 الملفات المتأثرة\n');
            lines.push('| الملف | العملية | الملخص |');
            lines.push('|-------|---------|--------|');
            for (const f of plan.filesAffected) {
                const icon = f.action === 'new' ? '✨' : f.action === 'modify' ? '🔧' : '🗑️';
                lines.push(`| ${f.path} | ${icon} ${f.action} | ${f.summary} |`);
            }
            lines.push('');
        }

        // Risks
        if (plan.risks.length > 0) {
            lines.push('## ⚠️ المخاطر\n');
            for (const r of plan.risks) { lines.push(`- ${r}`); }
            lines.push('');
        }

        return lines.join('\n');
    }

    // ─── Helpers ─────────────────────────────────────────────

    private sumEffort(suggestions: Suggestion[]): string {
        const total = suggestions.reduce((sum, s) => sum + this.parseEffortMinutes(s.estimatedEffort), 0);
        return this.formatMinutes(total);
    }

    private parseEffortMinutes(effort: string): number {
        const hourMatch = effort.match(/(\d+)\s*(?:-\s*\d+\s*)?hour/i);
        const minMatch = effort.match(/(\d+)\s*min/i);
        let minutes = 0;
        if (hourMatch) { minutes += parseInt(hourMatch[1]) * 60; }
        if (minMatch) { minutes += parseInt(minMatch[1]); }
        return minutes || 30; // default 30 min
    }

    private formatMinutes(total: number): string {
        if (total < 60) { return `${total} دقيقة`; }
        const hours = Math.floor(total / 60);
        const mins = total % 60;
        return mins > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${hours} ساعة`;
    }
}
