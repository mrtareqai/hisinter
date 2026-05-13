"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Browser Tool ⭐
// Open URLs, search, and basic web interaction
// Uses PowerShell Start-Process (zero native deps)
// ═══════════════════════════════════════════════════════════════
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
exports.createBrowserTools = void 0;
const cp = __importStar(require("child_process"));
function runCommand(command, timeout = 10000) {
    return new Promise((resolve, reject) => {
        cp.exec(command, {
            timeout,
            maxBuffer: 1024 * 1024,
            shell: 'powershell.exe',
        }, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(stderr || err.message));
            }
            else {
                resolve(stdout.trim());
            }
        });
    });
}
function createBrowserTools() {
    return [
        // ── Open URL ──
        {
            name: 'browser_open',
            description: 'Open a URL in the default web browser.',
            parameters: {
                url: { type: 'string', description: 'The URL to open (e.g., "https://google.com")' },
            },
            execute: async (args) => {
                const url = args.url;
                // Validate URL
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    return { success: false, output: 'URL must start with http:// or https://' };
                }
                try {
                    await runCommand(`Start-Process '${url.replace(/'/g, "''")}'`);
                    return { success: true, output: `Opened in browser: ${url}` };
                }
                catch (e) {
                    return { success: false, output: `Failed to open URL: ${e.message}` };
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
            execute: async (args) => {
                const query = encodeURIComponent(args.query);
                const engine = args.engine || 'google';
                const urls = {
                    google: `https://www.google.com/search?q=${query}`,
                    bing: `https://www.bing.com/search?q=${query}`,
                    duckduckgo: `https://duckduckgo.com/?q=${query}`,
                };
                const url = urls[engine] || urls.google;
                try {
                    await runCommand(`Start-Process '${url}'`);
                    return { success: true, output: `Searching ${engine} for: "${args.query}"` };
                }
                catch (e) {
                    return { success: false, output: `Failed to search: ${e.message}` };
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
            execute: async (args) => {
                const targetPath = args.path.replace(/'/g, "''");
                try {
                    await runCommand(`explorer.exe '${targetPath}'`);
                    return { success: true, output: `Opened: ${args.path}` };
                }
                catch (e) {
                    return { success: false, output: `Failed to open: ${e.message}` };
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
            execute: async (args) => {
                const url = args.url.replace(/'/g, "''");
                const savePath = args.savePath.replace(/'/g, "''");
                try {
                    await runCommand(`Invoke-WebRequest -Uri '${url}' -OutFile '${savePath}' -UseBasicParsing`, 60000 // 60s timeout for downloads
                    );
                    return { success: true, output: `Downloaded: ${args.url} → ${args.savePath}` };
                }
                catch (e) {
                    return { success: false, output: `Download failed: ${e.message}` };
                }
            },
        },
        // ── Get Page Title ──
        {
            name: 'browser_get_title',
            description: 'Get the title of the currently active browser window.',
            parameters: {},
            execute: async () => {
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
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
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
            execute: async (args) => {
                const url = args.url;
                const maxLen = parseInt(args.maxLength) || 4000;
                try {
                    const content = await fetchPageText(url);
                    return {
                        success: true,
                        output: content.substring(0, maxLen) + (content.length > maxLen ? '\n...(truncated)' : ''),
                    };
                }
                catch (e) {
                    return { success: false, output: `Failed to read ${url}: ${e.message}` };
                }
            },
        },
        // ── List Browser Tabs ──
        {
            name: 'browser_list_tabs',
            description: 'List open browser windows/tabs (Chrome, Edge, Firefox).',
            parameters: {},
            execute: async () => {
                try {
                    const out = await runCommand(`
Get-Process chrome,msedge,firefox -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -ne ''} | ForEach-Object {
    "$($_.ProcessName)|$($_.Id)|$($_.MainWindowTitle)"
}
                    `);
                    return { success: true, output: out || 'No browser windows found' };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Close Browser Tab ──
        {
            name: 'browser_close_tab',
            description: 'Close a specific browser window by title match.',
            parameters: { title: { type: 'string', description: 'Window title to close (partial match)' } },
            execute: async (args) => {
                const t = args.title.replace(/'/g, "''");
                try {
                    const out = await runCommand(`
$p = Get-Process chrome,msedge,firefox -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -like '*${t}*'} | Select-Object -First 1
if ($p) { $p.CloseMainWindow() | Out-Null; "Closed: $($p.MainWindowTitle)" } else { "No matching window found" }
                    `);
                    return { success: true, output: out };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
    ];
}
exports.createBrowserTools = createBrowserTools;
// ─── HTTP Helper for reading web pages ──────────────────────
function fetchPageText(url) {
    const lib = url.startsWith('https') ? require('https') : require('http');
    return new Promise((resolve, reject) => {
        lib.get(url, { headers: { 'User-Agent': 'Sinter-AI/2.0' }, timeout: 10000 }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchPageText(res.headers.location).then(resolve).catch(reject);
                return;
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
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
//# sourceMappingURL=browserTool.js.map