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
exports.createNarrativeStreamPanel = exports.NarrativeStreamPanel = void 0;
const vscode = __importStar(require("vscode"));
class NarrativeStreamPanel {
    context;
    panel = null;
    events = [];
    currentProgress = 0;
    constructor(context) {
        this.context = context;
    }
    async show(context) {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }
        this.panel = vscode.window.createWebviewPanel('narrativeStream', 'Sinter Execution', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        this.panel.webview.html = this.getHtml();
        this.panel.onDidDispose(() => {
            this.panel = null;
        });
        this.panel.webview.onDidReceiveMessage((message) => {
            this.handleMessage(message);
        });
    }
    addEvent(event) {
        this.events.push(event);
        this.currentProgress = event.progress;
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'addEvent',
                event,
            });
        }
    }
    setProgress(progress) {
        this.currentProgress = progress;
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'setProgress',
                progress,
            });
        }
    }
    addInfo(message) {
        this.addEvent({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'info',
            message,
            step: 'system',
            progress: this.currentProgress,
        });
    }
    addWarning(message) {
        this.addEvent({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'warning',
            message,
            step: 'system',
            progress: this.currentProgress,
        });
    }
    addError(message) {
        this.addEvent({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'error',
            message,
            step: 'system',
            progress: this.currentProgress,
        });
    }
    addSuccess(message) {
        this.addEvent({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'success',
            message,
            step: 'system',
            progress: 100,
        });
    }
    clear() {
        this.events = [];
        this.currentProgress = 0;
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'clear',
            });
        }
    }
    handleMessage(message) {
        switch (message.command) {
            case 'clear':
                this.clear();
                break;
            case 'export':
                this.exportEvents();
                break;
        }
    }
    exportEvents() {
        const content = this.events
            .map((e) => `[${new Date(e.timestamp).toISOString()}] ${e.type.toUpperCase()}: ${e.message}`)
            .join('\n');
        vscode.workspace.fs.writeFile(vscode.Uri.file(`${process.env.HOME}/.sinter/execution-log-${Date.now()}.txt`), Buffer.from(content));
        vscode.window.showInformationMessage('Execution log exported');
    }
    generateId() {
        return `${Date.now()}-${Math.random()}`;
    }
    getHtml() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sinter Execution Stream</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1a1f3a 50%, #0f172a 100%);
      color: #e2e8f0;
      padding: 20px;
      height: 100vh;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #475569 #1e293b;
    }

    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #1e293b;
    }

    ::-webkit-scrollbar-thumb {
      background: #475569;
      border-radius: 4px;
    }

    .container {
      max-width: 100%;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #334155;
    }

    .title {
      font-size: 18px;
      font-weight: 600;
      background: linear-gradient(90deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .progress-bar {
      flex: 1;
      height: 4px;
      background: #334155;
      border-radius: 2px;
      margin: 0 16px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #60a5fa, #a78bfa);
      transition: width 0.3s ease;
      border-radius: 2px;
    }

    .progress-text {
      font-size: 12px;
      color: #94a3b8;
      min-width: 40px;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 6px 12px;
      background: #334155;
      color: #e2e8f0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s ease;
    }

    button:hover {
      background: #475569;
    }

    .events-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .event {
      padding: 12px 16px;
      border-radius: 6px;
      border-left: 4px solid;
      background: rgba(255, 255, 255, 0.02);
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .event.progress {
      border-left-color: #3b82f6;
      background: rgba(59, 130, 246, 0.05);
    }

    .event.success {
      border-left-color: #10b981;
      background: rgba(16, 185, 129, 0.05);
    }

    .event.warning {
      border-left-color: #f59e0b;
      background: rgba(245, 158, 11, 0.05);
    }

    .event.error {
      border-left-color: #ef4444;
      background: rgba(239, 68, 68, 0.05);
    }

    .event.info {
      border-left-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.05);
    }

    .event-time {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .event-message {
      font-size: 13px;
      color: #e2e8f0;
      line-height: 1.5;
    }

    .event.progress .event-message {
      color: #60a5fa;
    }

    .event.success .event-message {
      color: #10b981;
    }

    .event.warning .event-message {
      color: #f59e0b;
    }

    .event.error .event-message {
      color: #ef4444;
    }

    .event.info .event-message {
      color: #8b5cf6;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state-text {
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">Execution Stream</div>
      <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill" style="width: 0%"></div>
        </div>
        <div class="progress-text" id="progressText">0%</div>
      </div>
      <div class="actions">
        <button onclick="handleExport()">Export</button>
        <button onclick="handleClear()">Clear</button>
      </div>
    </div>

    <div class="events-container" id="eventsContainer">
      <div class="empty-state">
        <div class="empty-state-icon">▸</div>
        <div class="empty-state-text">Waiting for execution to begin...</div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const eventsContainer = document.getElementById('eventsContainer');
    let hasEvents = false;

    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.command) {
        case 'addEvent':
          addEvent(message.event);
          break;
        case 'setProgress':
          setProgress(message.progress);
          break;
        case 'clear':
          clear();
          break;
      }
    });

    function addEvent(event) {
      if (!hasEvents) {
        eventsContainer.innerHTML = '';
        hasEvents = true;
      }

      const eventEl = document.createElement('div');
      eventEl.className = 'event ' + event.type;

      const time = new Date(event.timestamp).toLocaleTimeString();
      eventEl.innerHTML = \`
        <div class="event-time">\${time}</div>
        <div class="event-message">\${escapeHtml(event.message)}</div>
      \`;

      eventsContainer.appendChild(eventEl);
      eventsContainer.scrollTop = eventsContainer.scrollHeight;

      setProgress(event.progress);
    }

    function setProgress(progress) {
      document.getElementById('progressFill').style.width = progress + '%';
      document.getElementById('progressText').textContent = Math.round(progress) + '%';
    }

    function clear() {
      eventsContainer.innerHTML = \`
        <div class="empty-state">
          <div class="empty-state-icon">▸</div>
          <div class="empty-state-text">Waiting for execution to begin...</div>
        </div>
      \`;
      hasEvents = false;
      setProgress(0);
    }

    function handleExport() {
      vscode.postMessage({ command: 'export' });
    }

    function handleClear() {
      vscode.postMessage({ command: 'clear' });
    }

    function escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    }
  </script>
</body>
</html>
    `;
    }
}
exports.NarrativeStreamPanel = NarrativeStreamPanel;
const createNarrativeStreamPanel = (context) => {
    return new NarrativeStreamPanel(context);
};
exports.createNarrativeStreamPanel = createNarrativeStreamPanel;
//# sourceMappingURL=narrativeStreamPanel.js.map