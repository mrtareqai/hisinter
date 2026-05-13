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
export declare class ValidationRunner {
    private readonly workspaceRoot;
    private readonly enabled;
    constructor(workspaceRoot: string, enabled?: boolean);
    run(): Promise<ValidationReport>;
    private detectChecks;
    private dedupe;
    private exec;
}
