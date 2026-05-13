// ═══════════════════════════════════════════════════════════════
// Sinter AI — Document Creation Tool ⭐
// Create PowerPoint, HTML documents, and more
// Uses pptxgenjs for real PPTX creation
// ═══════════════════════════════════════════════════════════════

import * as path from 'path';
import * as fs from 'fs';
import { ToolDefinition, ToolResult } from './toolRegistry';

export function createDocumentTools(workspaceRoot: string): ToolDefinition[] {
    return [
        // ── Create PowerPoint ──
        {
            name: 'create_pptx',
            description: 'Create a real PowerPoint (.pptx) presentation file. Provide a title and array of slides with title and content.',
            parameters: {
                filename: { type: 'string', description: 'Output filename (e.g., "presentation.pptx")' },
                title: { type: 'string', description: 'Presentation title' },
                slides: { type: 'string', description: 'JSON array of slides: [{"title":"Slide 1","content":"Bullet points here"},...]' },
                theme: { type: 'string', description: 'Color theme: blue, dark, green, red, purple (default: blue)', required: false },
            },
            execute: async (args): Promise<ToolResult> => {
                const filename = args.filename as string || 'presentation.pptx';
                const title = args.title as string || 'Presentation';
                const theme = (args.theme as string) || 'blue';
                const filePath = path.resolve(workspaceRoot, filename.endsWith('.pptx') ? filename : filename + '.pptx');

                // Parse slides
                let slides: { title: string; content: string }[] = [];
                try {
                    if (typeof args.slides === 'string') {
                        slides = JSON.parse(args.slides);
                    } else if (Array.isArray(args.slides)) {
                        slides = args.slides as any;
                    }
                } catch {
                    // If JSON parsing fails, create a single slide from the content
                    slides = [{ title: title, content: String(args.slides || 'Content') }];
                }

                if (slides.length === 0) {
                    slides = [{ title: title, content: 'Created by Sinter AI' }];
                }

                // Theme colors
                const themes: Record<string, { bg: string; accent: string; text: string }> = {
                    blue: { bg: '0D1B2A', accent: '1B9CFC', text: 'E8F1FF' },
                    dark: { bg: '1A1A2E', accent: 'E94560', text: 'EAEAEA' },
                    green: { bg: '0B2027', accent: '40A798', text: 'E0F0ED' },
                    red: { bg: '2B0C0C', accent: 'FF4C4C', text: 'FFE0E0' },
                    purple: { bg: '1A0A2E', accent: '9B59B6', text: 'E8D5F5' },
                };
                const colors = themes[theme] || themes.blue;

                try {
                    // Try using pptxgenjs
                    const PptxGenJS = require('pptxgenjs');
                    const pptx = new PptxGenJS();
                    pptx.author = 'Sinter AI';
                    pptx.title = title;

                    // Title Slide
                    const titleSlide = pptx.addSlide();
                    titleSlide.background = { color: colors.bg };
                    titleSlide.addText(title, {
                        x: 0.5, y: 1.5, w: 9, h: 2,
                        fontSize: 36, fontFace: 'Segoe UI',
                        color: colors.accent, bold: true, align: 'center',
                    });
                    titleSlide.addText('Created by Sinter AI', {
                        x: 0.5, y: 4, w: 9, h: 0.5,
                        fontSize: 14, fontFace: 'Segoe UI',
                        color: colors.text, align: 'center', italic: true,
                    });

                    // Content Slides
                    for (const slide of slides) {
                        const s = pptx.addSlide();
                        s.background = { color: colors.bg };
                        // Title
                        s.addText(slide.title || '', {
                            x: 0.5, y: 0.3, w: 9, h: 0.8,
                            fontSize: 28, fontFace: 'Segoe UI',
                            color: colors.accent, bold: true,
                        });
                        // Divider line
                        s.addShape(pptx.ShapeType.rect, {
                            x: 0.5, y: 1.1, w: 9, h: 0.02,
                            fill: { color: colors.accent },
                        });
                        // Content
                        const content = slide.content || '';
                        const bullets = content.split(/[,;\n]/).map((b: string) => b.trim()).filter((b: string) => b);
                        if (bullets.length > 1) {
                            s.addText(
                                bullets.map((b: string) => ({
                                    text: b,
                                    options: { bullet: true, breakLine: true },
                                })),
                                {
                                    x: 0.8, y: 1.4, w: 8.5, h: 4,
                                    fontSize: 18, fontFace: 'Segoe UI',
                                    color: colors.text, lineSpacing: 32,
                                    valign: 'top',
                                }
                            );
                        } else {
                            s.addText(content, {
                                x: 0.8, y: 1.4, w: 8.5, h: 4,
                                fontSize: 18, fontFace: 'Segoe UI',
                                color: colors.text, valign: 'top',
                            });
                        }
                    }

                    // Save
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    await pptx.writeFile({ fileName: filePath });

                    return {
                        success: true,
                        output: `✅ Created PowerPoint: ${filePath}\n📊 ${slides.length + 1} slides (1 title + ${slides.length} content)\n🎨 Theme: ${theme}`,
                    };
                } catch (pptxError) {
                    // Fallback: Create an HTML-based presentation
                    return createHtmlPresentation(filePath.replace('.pptx', '.html'), title, slides, colors);
                }
            },
        },

        // ── Create HTML Document ──
        {
            name: 'create_html_doc',
            description: 'Create a beautiful HTML document/report with title, sections, and content.',
            parameters: {
                filename: { type: 'string', description: 'Output filename (e.g., "report.html")' },
                title: { type: 'string', description: 'Document title' },
                content: { type: 'string', description: 'Document content (supports Markdown-like syntax)' },
                theme: { type: 'string', description: 'Theme: light or dark (default: dark)', required: false },
            },
            execute: async (args): Promise<ToolResult> => {
                const filename = args.filename as string || 'document.html';
                const title = args.title as string || 'Document';
                const content = args.content as string || '';
                const theme = (args.theme as string) || 'dark';
                const filePath = path.resolve(workspaceRoot, filename);

                const isDark = theme === 'dark';
                const bg = isDark ? '#0d1117' : '#ffffff';
                const text = isDark ? '#e6edf3' : '#1a1a2e';
                const accent = isDark ? '#58a6ff' : '#0366d6';
                const surface = isDark ? '#161b22' : '#f6f8fa';

                // Convert simple markdown-like formatting
                let htmlContent = content
                    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/^- (.+)$/gm, '<li>$1</li>')
                    .replace(/\n/g, '<br>\n');

                const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:${bg};color:${text};line-height:1.7;padding:40px}
.container{max-width:800px;margin:0 auto}
h1{font-size:32px;color:${accent};margin-bottom:16px;border-bottom:2px solid ${accent};padding-bottom:8px}
h2{font-size:24px;color:${accent};margin:24px 0 12px}
h3{font-size:18px;margin:16px 0 8px}
p,li{font-size:16px;margin:8px 0}
ul{margin-left:24px}
li{margin:4px 0}
strong{color:${accent}}
code{background:${surface};padding:2px 6px;border-radius:4px;font-family:'Cascadia Code',monospace;font-size:14px}
pre{background:${surface};padding:16px;border-radius:8px;overflow-x:auto;margin:12px 0}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid ${surface};font-size:12px;color:#666;text-align:center}
</style>
</head>
<body>
<div class="container">
<h1>${title}</h1>
${htmlContent}
<div class="footer">Generated by Sinter AI — ${new Date().toLocaleDateString()}</div>
</div>
</body>
</html>`;

                try {
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    fs.writeFileSync(filePath, html, 'utf-8');
                    return { success: true, output: `✅ Created HTML document: ${filePath}` };
                } catch (e) {
                    return { success: false, output: `Failed: ${(e as Error).message}` };
                }
            },
        },
    ];
}

// ─── Fallback: HTML Presentation ────────────────────────────
function createHtmlPresentation(
    filePath: string,
    title: string,
    slides: { title: string; content: string }[],
    colors: { bg: string; accent: string; text: string },
): ToolResult {
    const slideHtml = slides.map((s, i) => {
        const bullets = s.content.split(/[,;\n]/).map(b => b.trim()).filter(b => b);
        const contentHtml = bullets.length > 1
            ? '<ul>' + bullets.map(b => `<li>${b}</li>`).join('') + '</ul>'
            : `<p>${s.content}</p>`;
        return `<div class="slide"><h2>${s.title}</h2>${contentHtml}<div class="num">${i + 2}</div></div>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#${colors.bg}}
.slide{width:100vw;height:100vh;display:flex;flex-direction:column;justify-content:center;padding:60px 80px;position:relative;page-break-after:always}
.slide.title-slide{text-align:center;justify-content:center}
h1{font-size:48px;color:#${colors.accent};margin-bottom:20px}
h2{font-size:36px;color:#${colors.accent};margin-bottom:30px;border-bottom:3px solid #${colors.accent};padding-bottom:10px}
p,li{font-size:24px;color:#${colors.text};line-height:1.8}
ul{margin-left:40px;list-style-type:disc}
li{margin:10px 0}
.subtitle{font-size:20px;color:#${colors.text};opacity:0.7;font-style:italic}
.num{position:absolute;bottom:20px;right:40px;font-size:14px;color:#${colors.text};opacity:0.4}
@media print{.slide{page-break-after:always}}
</style>
</head>
<body>
<div class="slide title-slide">
<h1>${title}</h1>
<p class="subtitle">Created by Sinter AI</p>
<div class="num">1</div>
</div>
${slideHtml}
</body>
</html>`;

    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, html, 'utf-8');
        return {
            success: true,
            output: `✅ Created HTML presentation: ${filePath}\n📊 ${slides.length + 1} slides\n💡 Note: pptxgenjs not available, created HTML format instead. Open in browser for full-screen slides.`,
        };
    } catch (e) {
        return { success: false, output: `Failed: ${(e as Error).message}` };
    }
}
