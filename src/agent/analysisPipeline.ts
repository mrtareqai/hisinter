// ═══════════════════════════════════════════════════════════════
// Sinter AI — Analysis Pipeline ⭐
// Transforms project scan data into structured analysis
// Identifies strengths, weaknesses, and improvement suggestions
// ═══════════════════════════════════════════════════════════════

import { ProjectMap, FileAnalysis, DependencyEdge } from './codebaseExplorer';

// ─── Types ──────────────────────────────────────────────────

export interface Suggestion {
    priority: 'critical' | 'high' | 'medium' | 'low';
    area: string;
    title: string;
    description: string;
    file: string;
    estimatedEffort: string;
}

export interface AnalysisResult {
    projectName: string;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: Suggestion[];
    architecture: string;
    riskAreas: string[];
    fileTable: { file: string; lines: number; language: string; complexity: string }[];
}

// ─── Analysis Rules ─────────────────────────────────────────

interface AnalysisRule {
    id: string;
    name: string;
    check: (map: ProjectMap) => Suggestion[];
}

const RULES: AnalysisRule[] = [
    {
        id: 'large-files',
        name: 'Large Files Detection',
        check: (map) => {
            return map.sourceFiles
                .filter(f => f.lines > 400)
                .map(f => ({
                    priority: f.lines > 700 ? 'high' as const : 'medium' as const,
                    area: 'architecture',
                    title: `Large file: ${f.relativePath}`,
                    description: `${f.lines} lines. Consider splitting into smaller modules.`,
                    file: f.relativePath,
                    estimatedEffort: '1-2 hours',
                }));
        },
    },
    {
        id: 'no-tests',
        name: 'Missing Tests',
        check: (map) => {
            const hasTests = map.sourceFiles.some(f =>
                f.relativePath.includes('test') || f.relativePath.includes('spec')
            );
            if (!hasTests && map.stats.totalSourceFiles > 3) {
                return [{
                    priority: 'high',
                    area: 'quality',
                    title: 'No test files found',
                    description: 'The project has no test files. Consider adding unit tests.',
                    file: '',
                    estimatedEffort: '2-4 hours',
                }];
            }
            return [];
        },
    },
    {
        id: 'unused-deps',
        name: 'Potentially Unused Dependencies',
        check: (map) => {
            const suggestions: Suggestion[] = [];
            const pkgFile = map.sourceFiles.find(f => f.relativePath === 'package.json');
            if (pkgFile) {
                try {
                    const pkg = JSON.parse(pkgFile.content);
                    const deps = Object.keys(pkg.dependencies || {});
                    for (const dep of deps) {
                        const isUsed = map.sourceFiles.some(f =>
                            f.content.includes(`'${dep}'`) || f.content.includes(`"${dep}"`)
                        );
                        if (!isUsed) {
                            suggestions.push({
                                priority: 'low',
                                area: 'dependencies',
                                title: `Possibly unused: ${dep}`,
                                description: `Dependency "${dep}" doesn't appear to be imported in any source file.`,
                                file: 'package.json',
                                estimatedEffort: '10 min',
                            });
                        }
                    }
                } catch { /* skip */ }
            }
            return suggestions;
        },
    },
    {
        id: 'todo-fixme',
        name: 'TODO/FIXME Comments',
        check: (map) => {
            const suggestions: Suggestion[] = [];
            for (const f of map.sourceFiles) {
                const lines = f.content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const match = lines[i].match(/(TODO|FIXME|HACK|XXX|BUG)[\s:]+(.+)/i);
                    if (match) {
                        suggestions.push({
                            priority: match[1].toUpperCase() === 'FIXME' || match[1].toUpperCase() === 'BUG' ? 'high' : 'medium',
                            area: 'code-quality',
                            title: `${match[1]}: ${match[2].trim().substring(0, 60)}`,
                            description: `Line ${i + 1} in ${f.relativePath}`,
                            file: f.relativePath,
                            estimatedEffort: '15-30 min',
                        });
                    }
                }
            }
            return suggestions;
        },
    },
    {
        id: 'inline-html',
        name: 'Inline HTML in Code',
        check: (map) => {
            return map.sourceFiles
                .filter(f => f.content.includes('`<!DOCTYPE html>') || f.content.includes('`<html'))
                .map(f => ({
                    priority: 'medium' as const,
                    area: 'architecture',
                    title: `Inline HTML in ${f.relativePath}`,
                    description: 'Large HTML strings embedded in code. Consider using separate template files.',
                    file: f.relativePath,
                    estimatedEffort: '1 hour',
                }));
        },
    },
    {
        id: 'hardcoded-values',
        name: 'Hardcoded Configuration',
        check: (map) => {
            return map.sourceFiles
                .filter(f => {
                    const has = f.content.includes('localhost:') || f.content.match(/['"]http:\/\/[^'"]+['"]/g);
                    return has && !f.relativePath.includes('config') && !f.relativePath.includes('.json');
                })
                .map(f => ({
                    priority: 'low' as const,
                    area: 'configuration',
                    title: `Hardcoded URLs in ${f.relativePath}`,
                    description: 'URLs or ports hardcoded in source. Consider using configuration.',
                    file: f.relativePath,
                    estimatedEffort: '30 min',
                }));
        },
    },
    {
        id: 'high-complexity',
        name: 'High Complexity Files',
        check: (map) => {
            return map.sourceFiles
                .filter(f => f.complexity === 'high')
                .map(f => ({
                    priority: 'medium' as const,
                    area: 'complexity',
                    title: `High complexity: ${f.relativePath}`,
                    description: `${f.lines} lines, ${f.classes.length} classes, ${f.functions.length} functions. Consider breaking down.`,
                    file: f.relativePath,
                    estimatedEffort: '2-3 hours',
                }));
        },
    },
    {
        id: 'circular-deps',
        name: 'Circular Dependencies',
        check: (map) => {
            const suggestions: Suggestion[] = [];
            const adjList = new Map<string, string[]>();

            for (const edge of map.dependencies) {
                const list = adjList.get(edge.from) || [];
                list.push(edge.to);
                adjList.set(edge.from, list);
            }

            // Simple cycle detection (depth 2)
            for (const [from, tos] of adjList) {
                for (const to of tos) {
                    const backLinks = adjList.get(to) || [];
                    if (backLinks.includes(from)) {
                        suggestions.push({
                            priority: 'high',
                            area: 'architecture',
                            title: `Circular dependency: ${from} ↔ ${to}`,
                            description: 'These files import each other. Consider extracting shared code.',
                            file: from,
                            estimatedEffort: '1-2 hours',
                        });
                    }
                }
            }
            return suggestions;
        },
    },
];

// ─── Pipeline ───────────────────────────────────────────────

export class AnalysisPipeline {

    /** Run full analysis on a project */
    analyze(projectMap: ProjectMap): AnalysisResult {
        const projectName = projectMap.root.split(/[\\/]/).pop() || 'Project';

        // Run all rules
        const allSuggestions: Suggestion[] = [];
        for (const rule of RULES) {
            allSuggestions.push(...rule.check(projectMap));
        }

        // Sort by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        allSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        // Build strengths
        const strengths = this.findStrengths(projectMap);

        // Build weaknesses
        const weaknesses = this.findWeaknesses(projectMap, allSuggestions);

        // Architecture description
        const architecture = this.describeArchitecture(projectMap);

        // Risk areas
        const riskAreas = allSuggestions
            .filter(s => s.priority === 'critical' || s.priority === 'high')
            .map(s => s.title);

        // File table
        const fileTable = projectMap.sourceFiles.map(f => ({
            file: f.relativePath,
            lines: f.lines,
            language: f.language,
            complexity: f.complexity,
        }));

        return {
            projectName,
            summary: this.buildSummary(projectMap, allSuggestions),
            strengths,
            weaknesses,
            suggestions: allSuggestions,
            architecture,
            riskAreas,
            fileTable,
        };
    }

    /** Format analysis as a readable Markdown report */
    formatAsMarkdown(result: AnalysisResult): string {
        const lines: string[] = [];

        lines.push(`# 📊 تحليل مشروع: ${result.projectName}\n`);
        lines.push(result.summary + '\n');

        // File table
        lines.push('## 📁 الملفات المحللة\n');
        lines.push('| الملف | الأسطر | اللغة | التعقيد |');
        lines.push('|-------|--------|-------|--------|');
        for (const f of result.fileTable) {
            const icon = f.complexity === 'high' ? '🔴' : f.complexity === 'medium' ? '🟡' : '🟢';
            lines.push(`| ${f.file} | ${f.lines} | ${f.language} | ${icon} ${f.complexity} |`);
        }
        lines.push('');

        // Strengths
        if (result.strengths.length > 0) {
            lines.push('## ✅ نقاط القوة\n');
            for (const s of result.strengths) { lines.push(`- ${s}`); }
            lines.push('');
        }

        // Weaknesses
        if (result.weaknesses.length > 0) {
            lines.push('## ⚠️ نقاط الضعف\n');
            for (const w of result.weaknesses) { lines.push(`- ${w}`); }
            lines.push('');
        }

        // Suggestions
        if (result.suggestions.length > 0) {
            lines.push('## 💡 اقتراحات التحسين\n');
            const icons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
            for (const s of result.suggestions) {
                lines.push(`${icons[s.priority]} **[${s.priority.toUpperCase()}]** ${s.title}`);
                lines.push(`   ${s.description}`);
                if (s.file) { lines.push(`   📄 File: \`${s.file}\` | ⏱️ ${s.estimatedEffort}`); }
                lines.push('');
            }
        }

        // Architecture
        lines.push('## 🏗️ البنية المعمارية\n');
        lines.push(result.architecture + '\n');

        return lines.join('\n');
    }

    // ─── Private ────────────────────────────────────────────

    private findStrengths(map: ProjectMap): string[] {
        const strengths: string[] = [];

        if (map.stats.languages['TypeScript']) {
            strengths.push('✅ يستخدم TypeScript — أمان أنواع ممتاز');
        }
        if (map.sourceFiles.some(f => f.relativePath.includes('test'))) {
            strengths.push('✅ يحتوي على اختبارات');
        }
        if (map.configFiles.some(f => f.includes('tsconfig'))) {
            strengths.push('✅ TypeScript مُعد بشكل صحيح');
        }
        if (map.sourceFiles.length > 5) {
            strengths.push('✅ مشروع منظم في ملفات متعددة');
        }
        if (map.dependencies.length > 0) {
            strengths.push('✅ هيكلة modular مع imports واضحة');
        }

        const avgLines = map.stats.totalLines / Math.max(map.stats.totalSourceFiles, 1);
        if (avgLines < 200) {
            strengths.push('✅ ملفات بأحجام معقولة (متوسط أقل من 200 سطر)');
        }

        return strengths;
    }

    private findWeaknesses(map: ProjectMap, suggestions: Suggestion[]): string[] {
        const weaknesses: string[] = [];

        const criticals = suggestions.filter(s => s.priority === 'critical').length;
        const highs = suggestions.filter(s => s.priority === 'high').length;

        if (criticals > 0) { weaknesses.push(`⚠️ ${criticals} مشاكل حرجة تحتاج إصلاح فوري`); }
        if (highs > 0) { weaknesses.push(`⚠️ ${highs} مشاكل عالية الأولوية`); }

        if (!map.sourceFiles.some(f => f.relativePath.includes('test'))) {
            weaknesses.push('⚠️ لا توجد اختبارات (unit tests)');
        }

        const largeFiles = map.sourceFiles.filter(f => f.lines > 400);
        if (largeFiles.length > 0) {
            weaknesses.push(`⚠️ ${largeFiles.length} ملفات كبيرة (أكثر من 400 سطر)`);
        }

        return weaknesses;
    }

    private describeArchitecture(map: ProjectMap): string {
        const parts: string[] = [];

        // Detect project type
        const hasPkg = map.configFiles.some(f => f.includes('package.json'));
        const hasPub = map.configFiles.some(f => f.includes('pubspec.yaml'));

        if (hasPkg) { parts.push('المشروع مبني على **Node.js/TypeScript**.'); }
        else if (hasPub) { parts.push('المشروع مبني على **Flutter/Dart**.'); }

        // Describe folder structure
        const dirs = new Set<string>();
        for (const f of map.sourceFiles) {
            const dir = f.relativePath.split('/').slice(0, -1).join('/');
            if (dir) { dirs.add(dir); }
        }
        if (dirs.size > 0) {
            parts.push(`\nالمجلدات الرئيسية: ${Array.from(dirs).slice(0, 10).map(d => '`' + d + '`').join(', ')}`);
        }

        // Describe dependencies
        if (map.dependencies.length > 0) {
            parts.push(`\nعدد الروابط بين الملفات: **${map.dependencies.length}** اعتمادية.`);
        }

        // Languages
        const langStr = Object.entries(map.stats.languages)
            .sort(([, a], [, b]) => b - a)
            .map(([lang, lines]) => `${lang}: ${lines} سطر`)
            .join(', ');
        parts.push(`\nاللغات: ${langStr}`);

        return parts.join('\n');
    }

    private buildSummary(map: ProjectMap, suggestions: Suggestion[]): string {
        return `المشروع يحتوي على **${map.stats.totalSourceFiles}** ملف مصدري ` +
            `بإجمالي **${map.stats.totalLines}** سطر. ` +
            `تم اكتشاف **${suggestions.length}** نقطة تحسين ` +
            `(${suggestions.filter(s => s.priority === 'critical' || s.priority === 'high').length} عالية الأولوية).`;
    }
}
