import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { ToolDefinition, ToolResult } from './toolRegistry';

interface SymbolRange {
    name: string;
    kind: string;
    startLine: number;
    endLine: number;
    text: string;
}

export function createAstTools(workspaceRoot: string): ToolDefinition[] {
    return [
        {
            name: 'ast_symbols',
            description: 'Analyze a TypeScript/JavaScript file with AST and return classes, functions, interfaces, imports, and exports with line ranges.',
            parameters: {
                path: { type: 'string', description: 'File path to analyze' },
            },
            execute: async (args): Promise<ToolResult> => {
                const filePath = resolvePath(args.path as string, workspaceRoot);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const symbols = collectSymbols(filePath, content);
                    return { success: true, output: JSON.stringify(symbols.map(toCompactSymbol), null, 2), data: symbols };
                } catch (error) {
                    return { success: false, output: `AST analysis failed: ${(error as Error).message}` };
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
            execute: async (args): Promise<ToolResult> => {
                const filePath = resolvePath(args.path as string, workspaceRoot);
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
                } catch (error) {
                    return { success: false, output: `AST symbol lookup failed: ${(error as Error).message}` };
                }
            },
        },
    ];
}

function collectSymbols(filePath: string, content: string): SymbolRange[] {
    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const symbols: SymbolRange[] = [];

    const visit = (node: ts.Node) => {
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

function getNodeName(node: ts.Node): string | null {
    if (
        ts.isClassDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isTypeAliasDeclaration(node)
    ) {
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

function kindName(node: ts.Node): string {
    if (ts.isClassDeclaration(node)) { return 'class'; }
    if (ts.isFunctionDeclaration(node)) { return 'function'; }
    if (ts.isInterfaceDeclaration(node)) { return 'interface'; }
    if (ts.isEnumDeclaration(node)) { return 'enum'; }
    if (ts.isTypeAliasDeclaration(node)) { return 'type'; }
    if (ts.isVariableStatement(node)) { return 'variable'; }
    if (ts.isMethodDeclaration(node)) { return 'method'; }
    return ts.SyntaxKind[node.kind] || 'node';
}

function toCompactSymbol(symbol: SymbolRange): Omit<SymbolRange, 'text'> {
    return {
        name: symbol.name,
        kind: symbol.kind,
        startLine: symbol.startLine,
        endLine: symbol.endLine,
    };
}

function resolvePath(filePath: string, workspaceRoot: string): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
}
