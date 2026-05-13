"use strict";
// ═══════════════════════════════════════════════════════════════
// Sinter AI — Computer Use Tool ⭐
// Full desktop control: Mouse, Keyboard, Screenshots, OCR
// Uses PowerShell + Windows APIs (zero native deps)
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
exports.createComputerUseTools = void 0;
const cp = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const PS_HELPERS = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices;
public class NM {
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, int d, int e);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder t, int c);
    public const uint LD=0x02,LU=0x04,RD=0x08,RU=0x10,MD=0x20,MU=0x40,WH=0x800;
}
'@
`;
function runPS(script, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const full = PS_HELPERS + '\n' + script;
        const enc = Buffer.from(full, 'utf16le').toString('base64');
        cp.exec(`powershell.exe -NoProfile -EncodedCommand ${enc}`, {
            timeout, maxBuffer: 5 * 1024 * 1024,
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
function createComputerUseTools(ssDir) {
    fs.mkdirSync(ssDir, { recursive: true });
    return [
        // ── Screenshot ──
        {
            name: 'computer_screenshot',
            description: 'Take a screenshot. Returns base64 image.',
            parameters: {
                region: { type: 'string', description: 'Optional "x,y,w,h" region. Empty=full screen.', required: false },
            },
            execute: async (args) => {
                const fp = path.join(ssDir, `ss_${Date.now()}.png`);
                const r = args.region;
                const esc = fp.replace(/\\/g, '\\\\');
                let s;
                if (r) {
                    const [x, y, w, h] = r.split(',').map(Number);
                    s = `$b=New-Object Drawing.Bitmap(${w},${h});$g=[Drawing.Graphics]::FromImage($b);$g.CopyFromScreen(${x},${y},0,0,(New-Object Drawing.Size(${w},${h})));$g.Dispose();$b.Save('${esc}');$b.Dispose();[Convert]::ToBase64String([IO.File]::ReadAllBytes('${esc}'))`;
                }
                else {
                    s = `$sc=[Windows.Forms.Screen]::PrimaryScreen.Bounds;$b=New-Object Drawing.Bitmap($sc.Width,$sc.Height);$g=[Drawing.Graphics]::FromImage($b);$g.CopyFromScreen($sc.Location,[Drawing.Point]::Empty,$sc.Size);$g.Dispose();$b.Save('${esc}');$b.Dispose();[Convert]::ToBase64String([IO.File]::ReadAllBytes('${esc}'))`;
                }
                try {
                    const b64 = await runPS(s, 15000);
                    return { success: true, output: `Screenshot: ${fp}`, images: [b64] };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Mouse Click ──
        {
            name: 'computer_mouse_click',
            description: 'Click at screen coordinates.',
            parameters: {
                x: { type: 'string', description: 'X coordinate' },
                y: { type: 'string', description: 'Y coordinate' },
                button: { type: 'string', description: 'left/right/middle', enum: ['left', 'right', 'middle'], required: false },
                clicks: { type: 'string', description: '1 or 2 (double-click)', required: false },
            },
            execute: async (args) => {
                const x = args.x, y = args.y, btn = args.button || 'left';
                const n = parseInt(args.clicks || '1');
                const df = btn === 'right' ? 'RD' : btn === 'middle' ? 'MD' : 'LD';
                const uf = btn === 'right' ? 'RU' : btn === 'middle' ? 'MU' : 'LU';
                const cl = Array(n).fill(`[NM]::mouse_event([uint32][NM]::${df},0,0,0,0);Sleep -M 50;[NM]::mouse_event([uint32][NM]::${uf},0,0,0,0);Sleep -M 80`).join(';');
                try {
                    await runPS(`[NM]::SetCursorPos(${x},${y});Sleep -M 50;${cl}`);
                    return { success: true, output: `Clicked ${btn} at (${x},${y}) x${n}` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Mouse Move ──
        {
            name: 'computer_mouse_move',
            description: 'Move mouse cursor to coordinates.',
            parameters: {
                x: { type: 'string', description: 'X' }, y: { type: 'string', description: 'Y' },
            },
            execute: async (args) => {
                try {
                    await runPS(`[NM]::SetCursorPos(${args.x},${args.y})`);
                    return { success: true, output: `Moved to (${args.x},${args.y})` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Mouse Scroll ──
        {
            name: 'computer_mouse_scroll',
            description: 'Scroll mouse wheel.',
            parameters: {
                direction: { type: 'string', description: 'up or down', enum: ['up', 'down'] },
                amount: { type: 'string', description: 'Clicks (1-10)', required: false },
            },
            execute: async (args) => {
                const amt = parseInt(args.amount || '3');
                const delta = args.direction === 'up' ? 120 * amt : -120 * amt;
                try {
                    await runPS(`[NM]::mouse_event([uint32][NM]::WH,0,0,${delta},0)`);
                    return { success: true, output: `Scrolled ${args.direction} x${amt}` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Keyboard Type ──
        {
            name: 'computer_keyboard_type',
            description: 'Type text via keyboard.',
            parameters: { text: { type: 'string', description: 'Text to type' } },
            execute: async (args) => {
                const t = args.text.replace(/'/g, "''").replace(/[+^%~(){}[\]]/g, '{$&}');
                try {
                    await runPS(`[Windows.Forms.SendKeys]::SendWait('${t}')`, 15000);
                    return { success: true, output: `Typed: "${args.text}"` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Keyboard Hotkey ──
        {
            name: 'computer_keyboard_hotkey',
            description: 'Press keyboard shortcut. Examples: "ctrl+s", "alt+f4", "enter".',
            parameters: { keys: { type: 'string', description: 'Key combo like "ctrl+s"' } },
            execute: async (args) => {
                const keyMap = { enter: '{ENTER}', tab: '{TAB}', escape: '{ESC}', esc: '{ESC}', backspace: '{BACKSPACE}', delete: '{DELETE}', up: '{UP}', down: '{DOWN}', left: '{LEFT}', right: '{RIGHT}', home: '{HOME}', end: '{END}', f1: '{F1}', f2: '{F2}', f3: '{F3}', f4: '{F4}', f5: '{F5}', f6: '{F6}', f7: '{F7}', f8: '{F8}', f9: '{F9}', f10: '{F10}', f11: '{F11}', f12: '{F12}', space: ' ' };
                const parts = args.keys.toLowerCase().split('+').map(k => k.trim());
                let mods = '', key = '';
                for (const p of parts) {
                    if (p === 'ctrl' || p === 'control') {
                        mods += '^';
                    }
                    else if (p === 'alt') {
                        mods += '%';
                    }
                    else if (p === 'shift') {
                        mods += '+';
                    }
                    else {
                        key = keyMap[p] || p;
                    }
                }
                try {
                    await runPS(`[Windows.Forms.SendKeys]::SendWait('${mods}${key}')`);
                    return { success: true, output: `Pressed: ${args.keys}` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Screen Info ──
        {
            name: 'computer_screen_info',
            description: 'Get screen resolution, mouse position, active window.',
            parameters: {},
            execute: async () => {
                try {
                    const out = await runPS(`$s=[Windows.Forms.Screen]::PrimaryScreen;$c=[Windows.Forms.Cursor]::Position;$h=[NM]::GetForegroundWindow();$t=New-Object Text.StringBuilder 256;[NM]::GetWindowText($h,$t,256)|Out-Null;"Screen: $($s.Bounds.Width)x$($s.Bounds.Height)";\"Mouse: ($($c.X),$($c.Y))\";"Window: $($t.ToString())"`);
                    return { success: true, output: out };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── OCR / Find Text ──
        {
            name: 'computer_find_text',
            description: 'Screenshot + OCR to read all text on screen. Optionally search for specific text.',
            parameters: { search: { type: 'string', description: 'Text to find (empty=read all)', required: false } },
            execute: async (args) => {
                const fp = path.join(ssDir, `ocr_${Date.now()}.png`);
                const esc = fp.replace(/\\/g, '\\\\');
                const s = `$sc=[Windows.Forms.Screen]::PrimaryScreen.Bounds;$b=New-Object Drawing.Bitmap($sc.Width,$sc.Height);$g=[Drawing.Graphics]::FromImage($b);$g.CopyFromScreen($sc.Location,[Drawing.Point]::Empty,$sc.Size);$g.Dispose();$b.Save('${esc}');$b.Dispose();"Screenshot saved for OCR at ${esc}"`;
                try {
                    await runPS(s, 15000);
                    // For now return screenshot path; full OCR via tesseract.js later
                    return { success: true, output: `OCR screenshot saved: ${fp}. Note: Full OCR requires tesseract.js (install via npm).` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Open App ──
        {
            name: 'computer_open_app',
            description: 'Open application by name/path or URL in browser.',
            parameters: { target: { type: 'string', description: 'App name, path, or URL' } },
            execute: async (args) => {
                try {
                    await runPS(`Start-Process '${args.target.replace(/'/g, "''")}'`);
                    return { success: true, output: `Opened: ${args.target}` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Wait ──
        {
            name: 'computer_wait',
            description: 'Wait specified milliseconds.',
            parameters: { ms: { type: 'string', description: 'Milliseconds to wait' } },
            execute: async (args) => {
                const ms = Math.min(parseInt(args.ms) || 1000, 30000);
                await new Promise(r => setTimeout(r, ms));
                return { success: true, output: `Waited ${ms}ms` };
            },
        },
        // ── Mouse Drag ──
        {
            name: 'computer_mouse_drag',
            description: 'Drag from point A to point B (click-hold, move, release).',
            parameters: {
                fromX: { type: 'string', description: 'Start X' },
                fromY: { type: 'string', description: 'Start Y' },
                toX: { type: 'string', description: 'End X' },
                toY: { type: 'string', description: 'End Y' },
            },
            execute: async (args) => {
                try {
                    await runPS(`[NM]::SetCursorPos(${args.fromX},${args.fromY});Sleep -M 100;[NM]::mouse_event([uint32][NM]::LD,0,0,0,0);Sleep -M 150;[NM]::SetCursorPos(${args.toX},${args.toY});Sleep -M 150;[NM]::mouse_event([uint32][NM]::LU,0,0,0,0)`);
                    return { success: true, output: `Dragged (${args.fromX},${args.fromY}) → (${args.toX},${args.toY})` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Window List ──
        {
            name: 'computer_window_list',
            description: 'List all visible windows with titles and positions.',
            parameters: {},
            execute: async () => {
                try {
                    const out = await runPS(`Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | ForEach-Object { "$($_.Id)|$($_.ProcessName)|$($_.MainWindowTitle)" }`);
                    return { success: true, output: out || 'No visible windows' };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Window Focus ──
        {
            name: 'computer_window_focus',
            description: 'Bring a window to front by title (partial match).',
            parameters: { title: { type: 'string', description: 'Window title (partial)' } },
            execute: async (args) => {
                try {
                    const t = args.title.replace(/'/g, "''");
                    await runPS(`Add-Type @'\nusing System; using System.Runtime.InteropServices;\npublic class WF { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); }\n'@\n$p=Get-Process | Where-Object {$_.MainWindowTitle -like '*${t}*'} | Select-Object -First 1; if($p){[WF]::SetForegroundWindow($p.MainWindowHandle);\"Focused: $($p.MainWindowTitle)\"}else{\"Window not found\"}`);
                    return { success: true, output: `Focused window matching: ${args.title}` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Window Resize ──
        {
            name: 'computer_window_resize',
            description: 'Move and resize a window by title.',
            parameters: {
                title: { type: 'string', description: 'Window title (partial)' },
                x: { type: 'string', description: 'X position' },
                y: { type: 'string', description: 'Y position' },
                width: { type: 'string', description: 'Width' },
                height: { type: 'string', description: 'Height' },
            },
            execute: async (args) => {
                try {
                    const t = args.title.replace(/'/g, "''");
                    await runPS(`Add-Type @'\nusing System; using System.Runtime.InteropServices;\npublic class WR { [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int ht, bool r); }\n'@\n$p=Get-Process | Where-Object {$_.MainWindowTitle -like '*${t}*'} | Select-Object -First 1; if($p){[WR]::MoveWindow($p.MainWindowHandle,${args.x},${args.y},${args.width},${args.height},$true);\"Resized\"}`);
                    return { success: true, output: `Resized '${args.title}' to ${args.width}x${args.height} at (${args.x},${args.y})` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Window Close ──
        {
            name: 'computer_window_close',
            description: 'Close a window by title.',
            parameters: { title: { type: 'string', description: 'Window title (partial)' } },
            execute: async (args) => {
                try {
                    const t = args.title.replace(/'/g, "''");
                    await runPS(`$p=Get-Process | Where-Object {$_.MainWindowTitle -like '*${t}*'} | Select-Object -First 1; if($p){$p.CloseMainWindow();\"Closed: $($p.MainWindowTitle)\"}else{\"Window not found\"}`);
                    return { success: true, output: `Closed window: ${args.title}` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Pixel Color ──
        {
            name: 'computer_pixel_color',
            description: 'Get the color of a pixel at screen coordinates.',
            parameters: {
                x: { type: 'string', description: 'X coordinate' },
                y: { type: 'string', description: 'Y coordinate' },
            },
            execute: async (args) => {
                try {
                    const out = await runPS(`$b=New-Object Drawing.Bitmap(1,1);$g=[Drawing.Graphics]::FromImage($b);$g.CopyFromScreen(${args.x},${args.y},0,0,(New-Object Drawing.Size(1,1)));$g.Dispose();$c=$b.GetPixel(0,0);$b.Dispose();"RGB($($c.R),$($c.G),$($c.B)) Hex:#$($c.R.ToString('X2'))$($c.G.ToString('X2'))$($c.B.ToString('X2'))"`);
                    return { success: true, output: out };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Clipboard Get ──
        {
            name: 'computer_clipboard_get',
            description: 'Read current clipboard text content.',
            parameters: {},
            execute: async () => {
                try {
                    const out = await runPS(`Get-Clipboard`);
                    return { success: true, output: out || '(clipboard empty)' };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Clipboard Set ──
        {
            name: 'computer_clipboard_set',
            description: 'Write text to clipboard.',
            parameters: { text: { type: 'string', description: 'Text to copy' } },
            execute: async (args) => {
                try {
                    const t = args.text.replace(/'/g, "''");
                    await runPS(`Set-Clipboard -Value '${t}'`);
                    return { success: true, output: `Copied to clipboard: "${args.text.substring(0, 50)}..."` };
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
        // ── Real OCR ──
        {
            name: 'computer_find_text_ocr',
            description: 'Take screenshot and extract ALL text using OCR. Search for specific text optionally.',
            parameters: { search: { type: 'string', description: 'Text to find (empty=read all)', required: false } },
            execute: async (args) => {
                const fp = path.join(ssDir, `ocr_${Date.now()}.png`);
                const esc = fp.replace(/\\/g, '\\\\');
                const s = `$sc=[Windows.Forms.Screen]::PrimaryScreen.Bounds;$b=New-Object Drawing.Bitmap($sc.Width,$sc.Height);$g=[Drawing.Graphics]::FromImage($b);$g.CopyFromScreen($sc.Location,[Drawing.Point]::Empty,$sc.Size);$g.Dispose();$b.Save('${esc}');$b.Dispose();"saved"`;
                try {
                    await runPS(s, 15000);
                    // Use tesseract.js for real OCR
                    try {
                        const Tesseract = require('tesseract.js');
                        const { data: { text } } = await Tesseract.recognize(fp, 'eng');
                        const searchTerm = args.search;
                        if (searchTerm) {
                            const lower = text.toLowerCase();
                            const idx = lower.indexOf(searchTerm.toLowerCase());
                            if (idx >= 0) {
                                return { success: true, output: `Found "${searchTerm}" in screen text.\n\nFull OCR:\n${text.substring(0, 3000)}` };
                            }
                            else {
                                return { success: true, output: `"${searchTerm}" NOT found on screen.\n\nFull OCR:\n${text.substring(0, 3000)}` };
                            }
                        }
                        return { success: true, output: `OCR Result:\n${text.substring(0, 4000)}` };
                    }
                    catch {
                        return { success: true, output: `Screenshot saved: ${fp}. Tesseract.js not available — run: npm install tesseract.js` };
                    }
                }
                catch (e) {
                    return { success: false, output: `Failed: ${e.message}` };
                }
            },
        },
    ];
}
exports.createComputerUseTools = createComputerUseTools;
//# sourceMappingURL=computerUseTool.js.map