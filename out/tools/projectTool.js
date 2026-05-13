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
exports.createProjectTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const projectGenerator_1 = require("../agent/projectGeneration/projectGenerator");
function createProjectTools(workspaceRoot) {
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
            execute: async (args) => {
                const requestedName = sanitizeProjectName(String(args.projectName || 'sinter-project'));
                const intent = String(args.intent || requestedName);
                const overwrite = String(args.overwrite || 'false').toLowerCase() === 'true';
                const projectName = overwrite ? requestedName : uniqueProjectName(workspaceRoot, requestedName);
                const projectPath = path.join(workspaceRoot, projectName);
                if (!await confirmProjectGeneration(projectPath, intent)) {
                    return { success: false, output: `Project generation cancelled: ${projectPath}` };
                }
                const generator = new projectGenerator_1.ProjectGenerator(workspaceRoot);
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
exports.createProjectTools = createProjectTools;
function sanitizeProjectName(value) {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    return normalized || 'sinter-project';
}
function uniqueProjectName(root, baseName) {
    let candidate = baseName;
    let index = 2;
    while (fs.existsSync(path.join(root, candidate))) {
        candidate = `${baseName}-${index}`;
        index += 1;
    }
    return candidate;
}
async function confirmProjectGeneration(projectPath, intent) {
    const config = vscode.workspace.getConfiguration('sinter');
    if (!config.get('requireEditApproval', true)) {
        return true;
    }
    const choice = await vscode.window.showWarningMessage(`Sinter wants to generate a project:\n${projectPath}\n\nIntent: ${intent.slice(0, 240)}`, { modal: true }, 'Approve Project');
    return choice === 'Approve Project';
}
//# sourceMappingURL=projectTool.js.map