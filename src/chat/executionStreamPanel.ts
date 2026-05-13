/**
 * Execution Stream Panel - Real-time execution visualization
 * 
 * This panel shows what's happening during task execution in real-time:
 * - Current phase and progress
 * - Step-by-step execution timeline
 * - Live events and decisions
 * - Recovery attempts
 * - Performance metrics
 */

import * as vscode from 'vscode';
import { ExecutionEvent, ExecutionEventType, ExecutionStreamManager } from '../runtime/executionStreamManager';

/**
 * Options for creating the execution stream panel
 */
export interface ExecutionStreamPanelOptions {
  title?: string;
  position?: vscode.ViewColumn;
  retainContextWhenHidden?: boolean;
}

export class ExecutionStreamPanel {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];
  private streamManager: ExecutionStreamManager;
  private currentPhase: string = 'idle';
  private events: ExecutionEvent[] = [];
  private eventUnsubscribe: (() => void) | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    streamManager: ExecutionStreamManager,
    options: ExecutionStreamPanelOptions = {}
  ) {
    this.streamManager = streamManager;
    this.setupPanel(options);
    this.subscribeToEvents();
    console.log('[ExecutionStreamPanel] Initialized');
  }

  /**
   * Show the panel
   */
  show(): void {
    if (!this.panel) {
      this.setupPanel();
    }
    this.panel?.reveal(this.panel.viewColumn || vscode.ViewColumn.Two);
  }

  /**
   * Hide the panel
   */
  hide(): void {
    this.panel?.dispose();
    this.panel = undefined;
  }

  /**
   * Update panel with event
   */
  private onEvent(event: ExecutionEvent): void {
    this.events.push(event);

    // Keep last 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    // Update phase if phase changed
    if (event.type === ExecutionEventType.PHASE_START) {
      this.currentPhase = event.phase;
    }

    // Update UI
    this.updateUI();
  }

  /**
   * Private: Setup the webview panel
   */
  private setupPanel(options: ExecutionStreamPanelOptions = {}): void {
    this.panel = vscode.window.createWebviewPanel(
      'executionStream',
      options.title || 'Sinter AI - Execution Stream',
      options.position || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: options.retainContextWhenHidden ?? true,
        localResourceRoots: [this.context.extensionUri]
      }
    );

    this.panel.webview.html = this.getWebviewContent();

    // Handle messages from webview
    this.disposables.push(
      this.panel.webview.onDidReceiveMessage(message => {
        this.handleWebviewMessage(message);
      })
    );

    // Cleanup on disposal
    this.disposables.push(
      this.panel.onDidDispose(() => {
        this.panel = undefined;
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
      })
    );
  }

  /**
   * Private: Subscribe to execution events
   */
  private subscribeToEvents(): void {
    this.eventUnsubscribe = this.streamManager.subscribe(event => {
      this.onEvent(event);
    });
  }

  /**
   * Private: Update UI with current state
   */
  private updateUI(): void {
    if (!this.panel) return;

    const stats = this.streamManager.getStatistics();
    const recentEvents = this.events.slice(-10);
    
    const phaseIcons = {
      'planning': '📋',
      'executing': '⚙️',
      'observing': '🔍',
      'recovering': '🛡️',
      'completion': '✅',
      'idle': '⏸'
    };

    const icon = phaseIcons[this.currentPhase as keyof typeof phaseIcons] || '•';

    this.panel.webview.postMessage({
      type: 'update',
      payload: {
        currentPhase: this.currentPhase,
        phaseIcon: icon,
        events: recentEvents,
        stats,
        allEvents: this.events
      }
    });
  }

  /**
   * Private: Handle messages from webview
   */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case 'clear':
        this.events = [];
        this.updateUI();
        break;
      case 'export':
        this.exportEvents();
        break;
      case 'ready':
        this.updateUI();
        break;
    }
  }

  /**
   * Private: Export events
   */
  private exportEvents(): void {
    const json = JSON.stringify(this.events, null, 2);
    
    // Save to file
    const path = require('path');
    const dir = path.join(this.context.globalStorageUri.fsPath, 'execution-history');
    const fs = require('fs');
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filename = `execution-${Date.now()}.json`;
    fs.writeFileSync(path.join(dir, filename), json);
    
    vscode.window.showInformationMessage(`Events exported to ${filename}`);
  }

  /**
   * Private: Get webview HTML content
   */
  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sinter AI - Execution Stream</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            line-height: 1.5;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100vh;
          }

          .header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
          }

          .header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 14px;
          }

          .phase-indicator {
            font-size: 18px;
            animation: pulse 1s infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }

          .header-actions {
            display: flex;
            gap: 8px;
          }

          .btn {
            padding: 4px 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s;
          }

          .btn:hover {
            background: var(--vscode-button-hoverBackground);
          }

          .btn:active {
            opacity: 0.8;
          }

          .content {
            flex: 1;
            overflow-y: auto;
            padding: 12px 16px;
          }

          .phase-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 12px;
          }

          .phase-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }

          .phase-value {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-editor-foreground);
          }

          .stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }

          .stat-item {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
          }

          .stat-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
          }

          .stat-value {
            font-size: 20px;
            font-weight: 600;
            color: #4ec9b0;
            margin-top: 4px;
          }

          .events-section {
            margin-top: 20px;
          }

          .events-title {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            font-weight: 600;
          }

          .event-item {
            padding: 8px 12px;
            margin-bottom: 6px;
            border-radius: 2px;
            font-size: 12px;
            border-left: 3px solid;
            background: var(--vscode-editor-background);
          }

          .event-item.success {
            border-left-color: #4ec9b0;
            color: #4ec9b0;
          }

          .event-item.error {
            border-left-color: #f44747;
            color: #f44747;
          }

          .event-item.warning {
            border-left-color: #dcdcaa;
            color: #dcdcaa;
          }

          .event-item.info {
            border-left-color: #569cd6;
            color: #569cd6;
          }

          .event-message {
            margin-top: 4px;
            color: var(--vscode-editor-foreground);
            opacity: 0.9;
          }

          .event-time {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 2px;
          }

          .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
          }

          .empty-state-icon {
            font-size: 48px;
            margin-bottom: 12px;
          }

          ::-webkit-scrollbar {
            width: 8px;
          }

          ::-webkit-scrollbar-track {
            background: transparent;
          }

          ::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-title">
            <span class="phase-indicator" id="phaseIcon">⏸</span>
            <span id="phaseText">Sinter AI - Execution Stream</span>
          </div>
          <div class="header-actions">
            <button class="btn" id="clearBtn">Clear</button>
            <button class="btn" id="exportBtn">Export</button>
          </div>
        </div>

        <div class="content">
          <div id="emptyState" class="empty-state">
            <div class="empty-state-icon">⏳</div>
            <p>Waiting for execution to start...</p>
          </div>

          <div id="mainContent" style="display: none;">
            <div class="phase-card">
              <div class="phase-label">Current Phase</div>
              <div class="phase-value" id="phaseValue">Idle</div>
            </div>

            <div class="stats" id="stats"></div>

            <div class="events-section">
              <div class="events-title">Recent Events</div>
              <div id="eventsList"></div>
            </div>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          let isVisible = false;

          window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'update') {
              const { currentPhase, phaseIcon, events, stats, allEvents } = message.payload;
              updateUI(currentPhase, phaseIcon, events, stats);
            }
          });

          document.getElementById('clearBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'clear' });
          });

          document.getElementById('exportBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'export' });
          });

          function updateUI(phase, icon, events, stats) {
            const emptyState = document.getElementById('emptyState');
            const mainContent = document.getElementById('mainContent');

            if (events.length > 0) {
              emptyState.style.display = 'none';
              mainContent.style.display = 'block';
            }

            document.getElementById('phaseIcon').textContent = icon;
            document.getElementById('phaseValue').textContent = phase.charAt(0).toUpperCase() + phase.slice(1);

            // Update stats
            const statsHtml = \`
              <div class="stat-item">
                <div class="stat-label">Total Events</div>
                <div class="stat-value">\${stats.totalEvents}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Success</div>
                <div class="stat-value">\${stats.successCount}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Errors</div>
                <div class="stat-value">\${stats.errorCount}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Avg Time</div>
                <div class="stat-value">\${(stats.averageExecutionTime / 1000).toFixed(1)}s</div>
              </div>
            \`;
            document.getElementById('stats').innerHTML = statsHtml;

            // Update events list
            const eventsHtml = events.map(event => {
              const time = new Date(event.timestamp).toLocaleTimeString();
              return \`
                <div class="event-item \${event.status}">
                  <strong>\${event.type}</strong>
                  <div class="event-message">\${event.message}</div>
                  <div class="event-time">\${time}</div>
                </div>
              \`;
            }).join('');

            document.getElementById('eventsList').innerHTML = eventsHtml || '<p style="color: var(--vscode-descriptionForeground);">No events yet...</p>';
          }

          // Notify panel is ready
          vscode.postMessage({ command: 'ready' });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Cleanup on dispose
   */
  dispose(): void {
    if (this.eventUnsubscribe) {
      this.eventUnsubscribe();
    }
    this.disposables.forEach(d => d.dispose());
    this.panel?.dispose();
    console.log('[ExecutionStreamPanel] Disposed');
  }
}
