"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyValidator = void 0;
class SafetyValidator {
    constraints = new Map();
    riskHistory = [];
    constructor() {
        this.initializeDefaultConstraints();
    }
    initializeDefaultConstraints() {
        // File path safety
        this.addConstraint({
            name: 'safe_file_paths',
            type: 'file_path',
            rule: (context) => {
                const path = context.path || '';
                const dangerousPaths = [
                    '/etc/',
                    '/sys/',
                    '/proc/',
                    '/root/',
                    'C:\\Windows\\',
                    'C:\\Program Files\\',
                ];
                return !dangerousPaths.some((dp) => path.startsWith(dp));
            },
            severity: 'critical',
            description: 'Prevent operations on system-critical paths',
        });
        // Command safety
        this.addConstraint({
            name: 'safe_commands',
            type: 'command',
            rule: (context) => {
                const command = context.command || '';
                const dangerousCommands = ['rm -rf', 'dd if=', 'mkfs', 'format', 'fdisk'];
                return !dangerousCommands.some((cmd) => command.includes(cmd));
            },
            severity: 'critical',
            description: 'Prevent execution of dangerous system commands',
        });
        // Resource limits
        this.addConstraint({
            name: 'resource_limits',
            type: 'resource',
            rule: (context) => {
                const memory = context.estimatedMemory || 0;
                const maxMemory = context.maxMemory || 1024 * 1024 * 1024; // 1GB
                return memory < maxMemory;
            },
            severity: 'warning',
            description: 'Prevent operations exceeding resource limits',
        });
        // Permission verification
        this.addConstraint({
            name: 'permission_check',
            type: 'permission',
            rule: (context) => {
                const required = context.requiredPermissions || [];
                const available = context.availablePermissions || [];
                return required.every((perm) => available.includes(perm));
            },
            severity: 'error',
            description: 'Verify required permissions are available',
        });
    }
    addConstraint(constraint) {
        this.constraints.set(constraint.name, constraint);
    }
    async validateOperation(context) {
        const results = [];
        let riskLevel = 'low';
        for (const [name, constraint] of this.constraints.entries()) {
            try {
                const passed = constraint.rule(context);
                results.push({
                    name,
                    passed,
                    severity: constraint.severity,
                    message: passed
                        ? `✓ ${constraint.description}`
                        : `✗ ${constraint.description}`,
                });
                if (!passed) {
                    if (constraint.severity === 'critical') {
                        riskLevel = 'critical';
                    }
                    else if (constraint.severity === 'error' && riskLevel !== 'critical') {
                        riskLevel = 'high';
                    }
                    else if (constraint.severity === 'warning' && riskLevel === 'low') {
                        riskLevel = 'medium';
                    }
                }
            }
            catch (error) {
                results.push({
                    name,
                    passed: false,
                    severity: 'error',
                    message: `Error validating constraint: ${error instanceof Error ? error.message : 'Unknown error'}`,
                });
                riskLevel = 'high';
            }
        }
        this.riskHistory.push({ timestamp: Date.now(), riskLevel });
        const isValid = riskLevel !== 'critical' && results.every((r) => r.severity !== 'critical' || r.passed);
        return {
            isValid,
            constraints: results,
            riskLevel,
            recommendedActions: this.generateRecommendations(results, riskLevel),
        };
    }
    generateRecommendations(constraints, riskLevel) {
        const recommendations = [];
        const failures = constraints.filter((c) => !c.passed);
        if (riskLevel === 'critical') {
            recommendations.push('BLOCK: Operation poses critical risk - cannot proceed');
            failures.forEach((f) => {
                if (f.severity === 'critical') {
                    recommendations.push(`- Critical: ${f.message}`);
                }
            });
        }
        else if (riskLevel === 'high') {
            recommendations.push('CAUTION: Operation poses high risk - verify before proceeding');
            failures.forEach((f) => {
                recommendations.push(`- ${f.severity.toUpperCase()}: ${f.message}`);
            });
        }
        else if (riskLevel === 'medium') {
            recommendations.push('INFO: Operation poses medium risk - monitor execution');
            failures.forEach((f) => {
                recommendations.push(`- ${f.severity.toUpperCase()}: ${f.message}`);
            });
        }
        else {
            recommendations.push('Operation validated successfully - safe to proceed');
        }
        return recommendations;
    }
    getRiskTrend() {
        if (this.riskHistory.length < 2)
            return 'stable';
        const recent = this.riskHistory.slice(-5);
        const older = this.riskHistory.slice(-10, -5);
        if (recent.length === 0 || older.length === 0)
            return 'stable';
        const riskScore = (level) => ({
            low: 1,
            medium: 2,
            high: 3,
            critical: 4,
        }[level] || 0);
        const recentAvg = recent.reduce((sum, r) => sum + riskScore(r.riskLevel), 0) / recent.length;
        const olderAvg = older.reduce((sum, r) => sum + riskScore(r.riskLevel), 0) / older.length;
        if (recentAvg > olderAvg + 0.5)
            return 'increasing';
        if (recentAvg < olderAvg - 0.5)
            return 'decreasing';
        return 'stable';
    }
    getConstraints() {
        const result = {};
        this.constraints.forEach((constraint, name) => {
            result[name] = constraint;
        });
        return result;
    }
}
exports.SafetyValidator = SafetyValidator;
exports.default = SafetyValidator;
//# sourceMappingURL=safetyValidator.js.map