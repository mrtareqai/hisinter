import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ValidationCheck {
    name: string;
    command: string;
    success: boolean;
    output: string;
    durationMs: number;
}

export interface ValidationReport {
    success: boolean;
    skipped: boolean;
    summary: string;
    checks: ValidationCheck[];
}

interface PlannedCheck {
    name: string;
    command: string;
}

export class ValidationRunner {
    constructor(private readonly workspaceRoot: string, private readonly enabled: boolean = true) {}

    async run(): Promise<ValidationReport> {
        if (!this.enabled) {
            return {
                success: true,
                skipped: true,
                summary: 'Validation disabled by configuration.',
                checks: [],
            };
        }

        const checks = this.detectChecks();
        if (checks.length === 0) {
            return {
                success: true,
                skipped: true,
                summary: 'No validation commands detected for this workspace.',
                checks: [],
            };
        }

        const results: ValidationCheck[] = [];
        for (const check of checks) {
            const result = await this.exec(check);
            results.push(result);
            if (!result.success) {
                break;
            }
        }

        const success = results.every((check) => check.success);
        return {
            success,
            skipped: false,
            summary: success
                ? `Validation passed: ${results.map((item) => item.name).join(', ')}.`
                : `Validation failed at ${results.find((item) => !item.success)?.name || 'unknown check'}.`,
            checks: results,
        };
    }

    private detectChecks(): PlannedCheck[] {
        const checks: PlannedCheck[] = [];
        const packagePath = path.join(this.workspaceRoot, 'package.json');
        const pubspecPath = path.join(this.workspaceRoot, 'pubspec.yaml');
        const tsconfigPath = path.join(this.workspaceRoot, 'tsconfig.json');

        if (fs.existsSync(packagePath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
                const scripts = pkg.scripts || {};
                if (scripts.lint) {
                    checks.push({ name: 'lint', command: 'npm run lint' });
                }
                if (scripts.typecheck) {
                    checks.push({ name: 'typecheck', command: 'npm run typecheck' });
                } else if (scripts.compile) {
                    checks.push({ name: 'compile', command: 'npm run compile' });
                } else if (fs.existsSync(tsconfigPath)) {
                    checks.push({ name: 'typecheck', command: 'npx tsc -p ./ --noEmit' });
                }
                if (scripts.test && !String(scripts.test).includes('no test specified')) {
                    checks.push({ name: 'tests', command: 'npm test' });
                }
                if (scripts.build) {
                    checks.push({ name: 'build', command: 'npm run build' });
                }
            } catch {
                if (fs.existsSync(tsconfigPath)) {
                    checks.push({ name: 'typecheck', command: 'npx tsc -p ./ --noEmit' });
                }
            }
        }

        if (fs.existsSync(pubspecPath)) {
            checks.push({ name: 'flutter analyze', command: 'flutter analyze' });
            checks.push({ name: 'flutter test', command: 'flutter test' });
        }

        return this.dedupe(checks);
    }

    private dedupe(checks: PlannedCheck[]): PlannedCheck[] {
        const seen = new Set<string>();
        const result: PlannedCheck[] = [];
        for (const check of checks) {
            if (seen.has(check.command)) {
                continue;
            }
            seen.add(check.command);
            result.push(check);
        }
        return result;
    }

    private exec(check: PlannedCheck): Promise<ValidationCheck> {
        const started = Date.now();
        return new Promise((resolve) => {
            cp.exec(check.command, {
                cwd: this.workspaceRoot,
                timeout: 120000,
                maxBuffer: 1024 * 1024 * 2,
                shell: 'powershell.exe',
            }, (error, stdout, stderr) => {
                const output = [
                    stdout ? `STDOUT:\n${stdout}` : '',
                    stderr ? `STDERR:\n${stderr}` : '',
                    error ? `ERROR: ${error.message}` : '',
                ].filter(Boolean).join('\n').trim();
                resolve({
                    name: check.name,
                    command: check.command,
                    success: !error,
                    output: output || '(no output)',
                    durationMs: Date.now() - started,
                });
            });
        });
    }
}
