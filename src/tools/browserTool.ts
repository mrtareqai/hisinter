// ═══════════════════════════════════════════════════════════════
// Sinter AI — Browser Tool ⭐
// Open URLs, search, and basic web interaction
// Uses PowerShell Start-Process (zero native deps)
// ═══════════════════════════════════════════════════════════════

import * as cp from 'child_process';
import { ToolDefinition, ToolResult } from './toolRegistry';

function runCommand(command: string, timeout = 10000): Promise<string> {
    return new Promise((resolve, reject) => {
        cp.exec(command, {
            timeout,
            maxBuffer: 1024 * 1024,
            shell: 'powershell.exe',
        }, (err, stdout, stderr) => {
            if (err) { reject(new Error(stderr || err.message)); }
            else { resolve(stdout.trim()); }
        });
    });
}

export function createBrowserTools(): ToolDefinition[] {
    return [
        // ── Open URL ──
        {
            name: 'browser_open',
            description: 'Open a URL in the default web browser.',
            parameters: {
                url: { type: 'string', description: 'The URL to open (e.g., "https://google.com")' },
            },
            execute: async (args): Promise<ToolResult> => {
                const url = args.url as string;
                // Validate URL
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    return { success: false, output: 'URL must start with http:// or https://' };
                }
                try {
                    await runCommand(`Start-Process '${url.replace(/'/g, "''")}'`);
                    return { success: true, output: `Opened in browser: ${url}` };
                } catch (e) {
                    return { success: false, output: `Failed to open URL: ${(e as Error).message}` };
                }
            },
        },

        // ── Search the Web ──
        {
            name: 'browser_search',
            description: 'Search the web using the default browser. Opens a Google search for the query.',
            parameters: {
                query: { type: 'string', description: 'Search query (e.g., "python trading bot")' },
                engine: {
                    type: 'string',
                    description: 'Search engine: google, bing, duckduckgo (default: google)',
                    enum: ['google', 'bing', 'duckduckgo'],
                    required: false,
                },
            },
            execute: async (args): Promise<ToolResult> => {
                const query = encodeURIComponent(args.query as string);
                const engine = (args.engine as string) || 'google';

                const urls: Record<string, string> = {
                    google: `https://www.google.com/search?q=${query}`,
                    bing: `https://www.bing.com/search?q=${query}`,
                    duckduckgo: `https://duckduckgo.com/?q=${query}`,
                };

                const url = urls[engine] || urls.google;

                try {
                    await runCommand(`Start-Process '${url}'`);
                    return { success: true, output: `Searching ${engine} for: "${args.query}"` };
                } catch (e) {
                    return { success: false, output: `Failed to search: ${(e as Error).message}` };
                }
            },
        },

        // ── Open File/Folder in Explorer ──
        {
            name: 'browser_open_folder',
            description: 'Open a file or folder in Windows Explorer.',
            parameters: {
                path: { type: 'string', description: 'Path to the file or folder to open' },
            },
            execute: async (args): Promise<ToolResult> => {
                const targetPath = (args.path as string).replace(/'/g, "''");
                try {
                    await runCommand(`explorer.exe '${targetPath}'`);
                    return { success: true, output: `Opened: ${args.path}` };
                } catch (e) {
                    return { success: false, output: `Failed to open: ${(e as Error).message}` };
                }
            },
        },

        // ── Download File ──
        {
            name: 'browser_download',
            description: 'Download a file from a URL to a local path.',
            parameters: {
                url: { type: 'string', description: 'URL of the file to download' },
                savePath: { type: 'string', description: 'Local path to save the file' },
            },
            execute: async (args): Promise<ToolResult> => {
                const url = (args.url as string).replace(/'/g, "''");
                const savePath = (args.savePath as string).replace(/'/g, "''");
                try {
                    await runCommand(
                        `Invoke-WebRequest -Uri '${url}' -OutFile '${savePath}' -UseBasicParsing`,
                        60000 // 60s timeout for downloads
                    );
                    return { success: true, output: `Downloaded: ${args.url} → ${args.savePath}` };
                } catch (e) {
                    return { success: false, output: `Download failed: ${(e as Error).message}` };
                }
            },
        },

        // ── Get Page Title ──
        {
            name: 'browser_get_title',
            description: 'Get the title of the currently active browser window.',
            parameters: {},
            execute: async (): Promise<ToolResult> => {
                try {
                    const title = await runCommand(`
Add-Type @'
using System; using System.Runtime.InteropServices;
public class WinHelper {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder t, int c);
}
'@
$h = [WinHelper]::GetForegroundWindow()
$t = New-Object Text.StringBuilder 512
[WinHelper]::GetWindowText($h, $t, 512) | Out-Null
$t.ToString()
                    `);
                    return { success: true, output: `Active window: ${title}` };
                } catch (e) {
                    return { success: false, output: `Failed: ${(e as Error).message}` };
                }
            },
        },

        // ── Read Page Content ──
        {
            name: 'browser_read_page',
            description: 'Fetch and read the text content of a web page URL via HTTP.',
            parameters: {
                url: { type: 'string', description: 'URL to read' },
                maxLength: { type: 'string', description: 'Max chars to return (default 4000)', required: false },
            },
            execute: async (args): Promise<ToolResult> => {
                const url = args.url as string;
                const maxLen = parseInt(args.maxLength as string) || 4000;
                try {
                    const content = await fetchPageText(url);
                    return {
                        success: true,
                        output: content.substring(0, maxLen) + (content.length > maxLen ? '\n...(truncated)' : ''),
                    };
                } catch (e) {
                    return { success: false, output: `Failed to read ${url}: ${(e as Error).message}` };
                }
            },
        },

        // ── List Browser Tabs ──
        {
            name: 'browser_list_tabs',
            description: 'List open browser windows/tabs (Chrome, Edge, Firefox).',
            parameters: {},
            execute: async (): Promise<ToolResult> => {
                try {
                    const out = await runCommand(`
Get-Process chrome,msedge,firefox -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -ne ''} | ForEach-Object {
    "$($_.ProcessName)|$($_.Id)|$($_.MainWindowTitle)"
}
                    `);
                    return { success: true, output: out || 'No browser windows found' };
                } catch (e) {
                    return { success: false, output: `Failed: ${(e as Error).message}` };
                }
            },
        },

        // ── Close Browser Tab ──
        {
            name: 'browser_close_tab',
            description: 'Close a specific browser window by title match.',
            parameters: { title: { type: 'string', description: 'Window title to close (partial match)' } },
            execute: async (args): Promise<ToolResult> => {
                const t = (args.title as string).replace(/'/g, "''");
                try {
                    const out = await runCommand(`
$p = Get-Process chrome,msedge,firefox -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -like '*${t}*'} | Select-Object -First 1
if ($p) { $p.CloseMainWindow() | Out-Null; "Closed: $($p.MainWindowTitle)" } else { "No matching window found" }
                    `);
                    return { success: true, output: out };
                } catch (e) {
                    return { success: false, output: `Failed: ${(e as Error).message}` };
                }
            },
        },
    ];
}

// ─── HTTP Helper for reading web pages ──────────────────────
function fetchPageText(url: string): Promise<string> {
    const lib = url.startsWith('https') ? require('https') : require('http');
    return new Promise((resolve, reject) => {
        lib.get(url, { headers: { 'User-Agent': 'Sinter-AI/2.0' }, timeout: 10000 }, (res: any) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchPageText(res.headers.location).then(resolve).catch(reject);
                return;
            }
            let data = '';
            res.on('data', (chunk: string) => data += chunk);
            res.on('end', () => {
                // Strip HTML tags, decode entities, clean whitespace
                let text = data
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/\s+/g, ' ')
                    .trim();
                resolve(text);
            });
        }).on('error', reject);
    });
}
