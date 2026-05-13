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
exports.ValidationRunner = void 0;
const cp = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ValidationRunner {
    workspaceRoot;
    enabled;
    constructor(workspaceRoot, enabled = true) {
        this.workspaceRoot = workspaceRoot;
        this.enabled = enabled;
    }
    async run() {
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
        const results = [];
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
    detectChecks() {
        const checks = [];
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
                }
                else if (scripts.compile) {
                    checks.push({ name: 'compile', command: 'npm run compile' });
                }
                else if (fs.existsSync(tsconfigPath)) {
                    checks.push({ name: 'typecheck', command: 'npx tsc -p ./ --noEmit' });
                }
                if (scripts.test && !String(scripts.test).includes('no test specified')) {
                    checks.push({ name: 'tests', command: 'npm test' });
                }
                if (scripts.build) {
                    checks.push({ name: 'build', command: 'npm run build' });
                }
            }
            catch {
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
    dedupe(checks) {
        const seen = new Set();
        const result = [];
        for (const check of checks) {
            if (seen.has(check.command)) {
                continue;
            }
            seen.add(check.command);
            result.push(check);
        }
        return result;
    }
    exec(check) {
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
exports.ValidationRunner = ValidationRunner;
//# sourceMappingURL=validationRunner.js.map