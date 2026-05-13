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
exports.createAstTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
function createAstTools(workspaceRoot) {
    return [
        {
            name: 'ast_symbols',
            description: 'Analyze a TypeScript/JavaScript file with AST and return classes, functions, interfaces, imports, and exports with line ranges.',
            parameters: {
                path: { type: 'string', description: 'File path to analyze' },
            },
            execute: async (args) => {
                const filePath = resolvePath(args.path, workspaceRoot);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const symbols = collectSymbols(filePath, content);
                    return { success: true, output: JSON.stringify(symbols.map(toCompactSymbol), null, 2), data: symbols };
                }
                catch (error) {
                    return { success: false, output: `AST analysis failed: ${error.message}` };
                }
            },
        },
        {
            name: 'ast_find_symbol',
            description: 'Find a class/function/interface/const by name in a TypeScript/JavaScript file and return the exact AST-owned snippet.',
            parameters: {
                path: { type: 'string', description: 'File path to analyze' },
                symbol: { type: 'string', description: 'Symbol name to locate' },
            },
            execute: async (args) => {
                const filePath = resolvePath(args.path, workspaceRoot);
                const symbolName = String(args.symbol || '');
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const symbols = collectSymbols(filePath, content);
                    const found = symbols.find((item) => item.name === symbolName);
                    if (!found) {
                        return { success: false, output: `Symbol not found: ${symbolName}` };
                    }
                    return {
                        success: true,
                        output: `${found.kind} ${found.name} lines ${found.startLine}-${found.endLine}\n\n${found.text}`,
                        data: found,
                    };
                }
                catch (error) {
                    return { success: false, output: `AST symbol lookup failed: ${error.message}` };
                }
            },
        },
    ];
}
exports.createAstTools = createAstTools;
function collectSymbols(filePath, content) {
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const symbols = [];
    const visit = (node) => {
        const name = getNodeName(node);
        if (name) {
            const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
            symbols.push({
                name,
                kind: kindName(node),
                startLine: start.line + 1,
                endLine: end.line + 1,
                text: node.getText(sourceFile),
            });
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return symbols;
}
function getNodeName(node) {
    if (ts.isClassDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isTypeAliasDeclaration(node)) {
        return node.name?.text || null;
    }
    if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (declaration && ts.isIdentifier(declaration.name)) {
            return declaration.name.text;
        }
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        return node.name.text;
    }
    return null;
}
function kindName(node) {
    if (ts.isClassDeclaration(node)) {
        return 'class';
    }
    if (ts.isFunctionDeclaration(node)) {
        return 'function';
    }
    if (ts.isInterfaceDeclaration(node)) {
        return 'interface';
    }
    if (ts.isEnumDeclaration(node)) {
        return 'enum';
    }
    if (ts.isTypeAliasDeclaration(node)) {
        return 'type';
    }
    if (ts.isVariableStatement(node)) {
        return 'variable';
    }
    if (ts.isMethodDeclaration(node)) {
        return 'method';
    }
    return ts.SyntaxKind[node.kind] || 'node';
}
function toCompactSymbol(symbol) {
    return {
        name: symbol.name,
        kind: symbol.kind,
        startLine: symbol.startLine,
        endLine: symbol.endLine,
    };
}
function resolvePath(filePath, workspaceRoot) {
    return path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
}
//# sourceMappingURL=astTool.js.map