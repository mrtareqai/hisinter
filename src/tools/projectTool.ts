import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ProjectGenerator } from '../agent/projectGeneration/projectGenerator';
import { ToolDefinition, ToolResult } from './toolRegistry';

export function createProjectTools(workspaceRoot: string): ToolDefinition[] {
    return [
        {
            name: 'project_generate',
            description: [
                'ONLY use this when the user explicitly asks for a "scaffold", "template", or "starter project".',
                'For normal requests like "make a website" or "create an app", DO NOT use this tool.',
                'Instead, use file_write to create each file with your own creative, original code.',
                'This tool generates basic boilerplate only — it does NOT write creative or custom code.',
            ].join(' '),
            parameters: {
                projectName: { type: 'string', description: 'Project folder name to create. Use kebab-case.' },
                intent: { type: 'string', description: 'Original user request and important details.' },
                overwrite: { type: 'string', description: '"true" to reuse an existing folder, otherwise a safe unique folder is created.', required: false },
            },
            execute: async (args): Promise<ToolResult> => {
                const requestedName = sanitizeProjectName(String(args.projectName || 'sinter-project'));
                const intent = String(args.intent || requestedName);
                const overwrite = String(args.overwrite || 'false').toLowerCase() === 'true';
                const projectName = overwrite ? requestedName : uniqueProjectName(workspaceRoot, requestedName);
                const projectPath = path.join(workspaceRoot, projectName);

                if (!await confirmProjectGeneration(projectPath, intent)) {
                    return { success: false, output: `Project generation cancelled: ${projectPath}` };
                }

                const generator = new ProjectGenerator(workspaceRoot);
                const result = await generator.generateProject(projectName, intent);

                if (!result.success) {
                    return { success: false, output: result.message, data: result };
                }

                return {
                    success: true,
                    output: [
                        result.message,
                        `Path: ${result.projectPath}`,
                        `Files (${result.filesCreated.length}):`,
                        ...result.filesCreated.map((file) => `- ${file}`),
                    ].join('\n'),
                    data: result,
                };
            },
        },
    ];
}

function sanitizeProjectName(value: string): string {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    return normalized || 'sinter-project';
}

function uniqueProjectName(root: string, baseName: string): string {
    let candidate = baseName;
    let index = 2;
    while (fs.existsSync(path.join(root, candidate))) {
        candidate = `${baseName}-${index}`;
        index += 1;
    }
    return candidate;
}

async function confirmProjectGeneration(projectPath: string, intent: string): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('sinter');
    if (!config.get<boolean>('requireEditApproval', true)) {
        return true;
    }

    const choice = await vscode.window.showWarningMessage(
        `Sinter wants to generate a project:\n${projectPath}\n\nIntent: ${intent.slice(0, 240)}`,
        { modal: true },
        'Approve Project'
    );
    return choice === 'Approve Project';
}
