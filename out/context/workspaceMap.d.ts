/**
 * Generate a compact workspace map string for injection into prompts.
 * Max 40 lines to stay within 6.7B model context budget.
 */
export declare function getCompactWorkspaceMap(workspaceRoot: string): string;
/**
 * Invalidate the cached workspace map (call after file mutations).
 */
export declare function invalidateWorkspaceMap(): void;
