/**
 * Analytics and Insights Panel
 * Real-time monitoring and optimization recommendations
 */

import { globalMonitor } from '../runtime/performanceMonitor';
import { globalCache } from '../runtime/cacheManager';
import { globalContextOptimizer } from '../runtime/contextOptimizer';
import { globalWorkspaceIntelligence } from '../agent/workspaceIntelligence';

export class AnalyticsPanel {
    generateDashboard(): string {
        const metrics = globalMonitor.getMetrics();
        const cacheStats = globalCache.getStats();
        const workspaceStats = globalWorkspaceIntelligence.getFilesSummary();
        const contextTrends = globalContextOptimizer.getContextTrends();
        const alerts = globalMonitor.getAlerts();

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0d1117;
            color: #c9d1d9;
            padding: 20px;
        }
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 16px;
            transition: all 0.3s ease;
        }
        .metric-card:hover {
            border-color: #58a6ff;
            transform: translateY(-2px);
        }
        .metric-title {
            font-size: 12px;
            text-transform: uppercase;
            color: #8b949e;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #58a6ff;
            margin-bottom: 8px;
        }
        .metric-sub {
            font-size: 12px;
            color: #8b949e;
        }
        .progress-bar {
            width: 100%;
            height: 4px;
            background: #30363d;
            border-radius: 2px;
            overflow: hidden;
            margin-top: 8px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #58a6ff, #79c0ff);
            transition: width 0.3s ease;
        }
        .alerts {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
        }
        .alert-item {
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 8px;
            font-size: 12px;
        }
        .alert-high {
            background: rgba(248, 81, 73, 0.1);
            border-left: 3px solid #f85149;
            color: #f85149;
        }
        .alert-medium {
            background: rgba(230, 158, 35, 0.1);
            border-left: 3px solid #e69e34;
            color: #e69e34;
        }
        .alert-low {
            background: rgba(58, 166, 124, 0.1);
            border-left: 3px solid #3fb950;
            color: #3fb950;
        }
        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .optimization-tips {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 16px;
        }
        .tip {
            padding: 12px;
            background: rgba(88, 166, 255, 0.1);
            border-left: 3px solid #58a6ff;
            margin-bottom: 8px;
            border-radius: 4px;
            font-size: 12px;
            color: #c9d1d9;
        }
        .workspace-info {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 16px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #30363d;
            font-size: 12px;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            color: #8b949e;
        }
        .info-value {
            color: #58a6ff;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <h1 style="margin-bottom: 20px; font-size: 20px;">Sinter AI Analytics</h1>
    
    <div class="dashboard">
        <div class="metric-card">
            <div class="metric-title">Agent Execution Time</div>
            <div class="metric-value">${metrics.agentExecutionTime.toFixed(0)}ms</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(100, (metrics.agentExecutionTime / 5000) * 100)}%"></div>
            </div>
            <div class="metric-sub">Target: 5000ms</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">Model Latency</div>
            <div class="metric-value">${metrics.modelLatency.toFixed(0)}ms</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(100, (metrics.modelLatency / 3000) * 100)}%"></div>
            </div>
            <div class="metric-sub">Target: 3000ms</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">Cache Hit Rate</div>
            <div class="metric-value">${(cacheStats.hitRate * 100).toFixed(1)}%</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${cacheStats.hitRate * 100}%"></div>
            </div>
            <div class="metric-sub">Hits: ${cacheStats.totalHits} | Misses: ${cacheStats.totalMisses}</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">Success Rate</div>
            <div class="metric-value">${(metrics.successRate * 100).toFixed(1)}%</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${metrics.successRate * 100}%"></div>
            </div>
            <div class="metric-sub">Avg Iterations: ${metrics.averageIterations.toFixed(1)}</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">Context Usage</div>
            <div class="metric-value">${(contextTrends.avgSize / 1024).toFixed(0)}KB</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(100, (contextTrends.avgSize / (contextTrends.maxSize || 1)) * 100)}%"></div>
            </div>
            <div class="metric-sub">Max: ${(contextTrends.maxSize / 1024).toFixed(0)}KB</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">Project Files</div>
            <div class="metric-value">${workspaceStats.total}</div>
            <div class="metric-sub">
                ${Object.entries(workspaceStats.byLanguage)
                    .slice(0, 3)
                    .map(([lang, count]) => `${lang}: ${count}`)
                    .join(' | ')}
            </div>
        </div>
    </div>

    ${alerts.length > 0 ? `
        <div class="alerts">
            <h2 style="font-size: 14px; margin-bottom: 12px; color: #c9d1d9;">🚨 Active Alerts</h2>
            ${alerts.map(alert => `
                <div class="alert-item alert-${alert.severity}">
                    <strong>${alert.metric}</strong>: ${alert.message}
                </div>
            `).join('')}
        </div>
    ` : ''}

    <div class="optimization-tips">
        <h2 style="font-size: 14px; margin-bottom: 12px; color: #c9d1d9;">💡 Optimization Suggestions</h2>
        ${globalMonitor.getOptimizationSuggestions().length > 0 ? 
            globalMonitor.getOptimizationSuggestions()
                .map(tip => `<div class="tip">${tip}</div>`)
                .join('') 
            : '<div class="tip">All systems optimal!</div>'
        }
    </div>

    <div style="margin-top: 16px;">
        <div class="grid-2">
            <div class="workspace-info">
                <h3 style="font-size: 12px; text-transform: uppercase; color: #8b949e; margin-bottom: 12px;">Performance Summary</h3>
                <div class="info-row">
                    <span class="info-label">Token Usage</span>
                    <span class="info-value">${metrics.tokenUsage.toFixed(0)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Memory</span>
                    <span class="info-value">${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Avg Retrieval</span>
                    <span class="info-value">${cacheStats.avgRetrievalTime.toFixed(2)}ms</span>
                </div>
            </div>

            <div class="workspace-info">
                <h3 style="font-size: 12px; text-transform: uppercase; color: #8b949e; margin-bottom: 12px;">Cache Summary</h3>
                <div class="info-row">
                    <span class="info-label">Total Hits</span>
                    <span class="info-value">${cacheStats.totalHits}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Total Misses</span>
                    <span class="info-value">${cacheStats.totalMisses}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Memory Used</span>
                    <span class="info-value">${(cacheStats.memoryUsage / 1024).toFixed(2)}KB</span>
                </div>
            </div>
        </div>
    </div>

    <div style="margin-top: 16px; padding: 16px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; font-size: 11px; color: #8b949e;">
        <strong>Last Updated:</strong> ${new Date().toLocaleTimeString()}
    </div>
</body>
</html>
        `;

        return html;
    }
}

export const analyticsPanel = new AnalyticsPanel();
