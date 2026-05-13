// ═══════════════════════════════════════════════════════════════
// Sinter AI — Smart File Edit Tools
// Surgical editing: replace, insert, patch — optimized for small models
// These tools let the model edit EXISTING files without regenerating
// the entire file content. Critical for 6.7B models.
// ═══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ToolDefinition, ToolResult } from './toolRegistry';

export function createFileEditTools(workspaceRoot: string): ToolDefinition[] {
    return [
        {
            name: 'file_replace',
            description: [
                'Replace specific text in an EXISTING file.',
                'Use this to EDIT files instead of rewriting them entirely.',
                'ALWAYS use file_read first to see the current content, then use file_replace to change specific parts.',
                'The "search" text must EXACTLY match text in the file (including whitespace).',
            ].join(' '),
            parameters: {
                path: { type: 'string', description: 'File path to edit' },
                search: { type: 'string', description: 'Exact text to find in the file (must match exactly, including whitespace and newlines)' },
                replace: { type: 'string', description: 'New text to replace the found text with' },
            },
            execute: async (args): Promise<ToolResult> => {
                const filePath = resolvePath(String(args.path || ''), workspaceRoot);
                const search = String(args.search || '');
                const replace = String(args.replace || '');

                if (!search) {
                    return { success: false, output: 'Error: "search" parameter is empty. Provide the exact text to find.' };
                }

                try {
                    if (!fs.existsSync(filePath)) {
                        return { success: false, output: `File not found: ${filePath}. Use file_write to create new files.` };
                    }

                    if (!await confirmEdit('replace text in', filePath)) {
                        return { success: false, output: `Edit cancelled by user: ${filePath}` };
                    }

                    const content = fs.readFileSync(filePath, 'utf-8');
                    const occurrences = countOccurrences(content, search);

                    if (occurrences === 0) {
                        // Try fuzzy match — maybe whitespace difference
                        const fuzzySearch = search.replace(/\s+/g, '\\s+');
                        const fuzzyRegex = new RegExp(fuzzySearch);
                        const fuzzyMatch = content.match(fuzzyRegex);

                        if (fuzzyMatch) {
                            const newContent = content.replace(fuzzyRegex, replace);
                            fs.writeFileSync(filePath, newContent, 'utf-8');
                            return {
                                success: true,
                                output: `Replaced text in ${filePath} (fuzzy match — whitespace was slightly different). File updated.`,
                            };
                        }

                        // Show nearby content to help model find the right text
                        const lines = content.split('\n');
                        const searchLower = search.toLowerCase().trim();
                        const nearMatches: string[] = [];
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].toLowerCase().includes(searchLower.split('\n')[0].trim())) {
                                nearMatches.push(`  Line ${i + 1}: ${lines[i].substring(0, 120)}`);
                            }
                        }

                        let hint = `Text not found in ${filePath}.`;
                        if (nearMatches.length > 0) {
                            hint += `\nSimilar lines found:\n${nearMatches.slice(0, 5).join('\n')}`;
                            hint += '\nTip: Use file_read to see exact content, then copy the exact text to "search".';
                        } else {
                            hint += '\nUse file_read to see the current file content first.';
                        }
                        return { success: false, output: hint };
                    }

                    const newContent = content.replace(search, replace);
                    fs.writeFileSync(filePath, newContent, 'utf-8');

                    const info = occurrences > 1
                        ? ` (replaced first occurrence, ${occurrences} total found)`
                        : '';

                    return {
                        success: true,
                        output: `Replaced text in ${filePath}${info}. File updated successfully.`,
                    };
                } catch (e) {
                    return { success: false, output: `Edit failed: ${(e as Error).message}` };
                }
            },
        },

        {
            name: 'file_insert',
            description: [
                'Insert new text at a specific line number in an existing file.',
                'Use this to ADD new code (imports, functions, HTML elements) without changing existing content.',
                'Line 1 = top of file. The text is inserted BEFORE the specified line.',
            ].join(' '),
            parameters: {
                path: { type: 'string', description: 'File path to edit' },
                line: { type: 'string', description: 'Line number to insert BEFORE (1-based). Use "end" to append at the end.' },
                content: { type: 'string', description: 'Text content to insert' },
            },
            execute: async (args): Promise<ToolResult> => {
                const filePath = resolvePath(String(args.path || ''), workspaceRoot);
                const lineArg = String(args.line || '1');
                const insertContent = String(args.content || '');

                if (!insertContent) {
                    return { success: false, output: 'Error: "content" parameter is empty. Provide the text to insert.' };
                }

                try {
                    if (!fs.existsSync(filePath)) {
                        return { success: false, output: `File not found: ${filePath}. Use file_write to create new files.` };
                    }

                    if (!await confirmEdit('insert text into', filePath)) {
                        return { success: false, output: `Edit cancelled by user: ${filePath}` };
                    }

                    const content = fs.readFileSync(filePath, 'utf-8');
                    const lines = content.split('\n');

                    if (lineArg.toLowerCase() === 'end') {
                        lines.push(insertContent);
                    } else {
                        const lineNum = parseInt(lineArg, 10);
                        if (isNaN(lineNum) || lineNum < 1) {
                            return { success: false, output: `Invalid line number: ${lineArg}. Must be a positive integer or "end".` };
                        }
                        const insertIndex = Math.min(lineNum - 1, lines.length);
                        const insertLines = insertContent.split('\n');
                        lines.splice(insertIndex, 0, ...insertLines);
                    }

                    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');

                    return {
                        success: true,
                        output: `Inserted ${insertContent.split('\n').length} line(s) at line ${lineArg} in ${filePath}. File now has ${lines.length} lines.`,
                    };
                } catch (e) {
                    return { success: false, output: `Insert failed: ${(e as Error).message}` };
                }
            },
        },

        {
            name: 'file_patch',
            description: [
                'Apply multiple search-and-replace edits to one file in a single operation.',
                'Use this when you need to make several changes across one file.',
                'The "edits" parameter is a JSON string: [{"search":"old text","replace":"new text"}, ...]',
            ].join(' '),
            parameters: {
                path: { type: 'string', description: 'File path to edit' },
                edits: { type: 'string', description: 'JSON array of edits: [{"search":"old","replace":"new"}, ...]' },
            },
            execute: async (args): Promise<ToolResult> => {
                const filePath = resolvePath(String(args.path || ''), workspaceRoot);
                const editsRaw = String(args.edits || '[]');

                try {
                    if (!fs.existsSync(filePath)) {
                        return { success: false, output: `File not found: ${filePath}` };
                    }

                    let edits: { search: string; replace: string }[];
                    try {
                        edits = JSON.parse(editsRaw);
                    } catch {
                        return { success: false, output: 'Invalid JSON in "edits" parameter. Format: [{"search":"old","replace":"new"}]' };
                    }

                    if (!Array.isArray(edits) || edits.length === 0) {
                        return { success: false, output: 'Edits array is empty. Provide at least one {search, replace} pair.' };
                    }

                    if (!await confirmEdit(`apply ${edits.length} patches to`, filePath)) {
                        return { success: false, output: `Patch cancelled by user: ${filePath}` };
                    }

                    let content = fs.readFileSync(filePath, 'utf-8');
                    let applied = 0;
                    let failed = 0;
                    const failures: string[] = [];

                    for (const edit of edits) {
                        if (!edit.search) { continue; }
                        if (content.includes(edit.search)) {
                            content = content.replace(edit.search, edit.replace);
                            applied++;
                        } else {
                            failed++;
                            failures.push(`"${edit.search.substring(0, 60)}..." not found`);
                        }
                    }

                    if (applied > 0) {
                        fs.writeFileSync(filePath, content, 'utf-8');
                    }

                    let msg = `Patch: ${applied}/${edits.length} edits applied to ${filePath}.`;
                    if (failures.length > 0) {
                        msg += `\nFailed edits:\n${failures.slice(0, 5).join('\n')}`;
                    }

                    return { success: applied > 0, output: msg };
                } catch (e) {
                    return { success: false, output: `Patch failed: ${(e as Error).message}` };
                }
            },
        },
    ];
}

// ─── Helpers ────────────────────────────────────────────────

function resolvePath(p: string, root: string): string {
    if (path.isAbsolute(p)) { return p; }
    return path.resolve(root, p);
}

function countOccurrences(text: string, search: string): number {
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(search, pos)) !== -1) {
        count++;
        pos += search.length;
    }
    return count;
}

async function confirmEdit(action: string, filePath: string): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('sinter');
    if (!config.get<boolean>('requireEditApproval', true)) {
        return true;
    }
    const choice = await vscode.window.showWarningMessage(
        `Sinter wants to ${action} file:\n${filePath}`,
        { modal: true },
        'Approve Edit'
    );
    return choice === 'Approve Edit';
}
