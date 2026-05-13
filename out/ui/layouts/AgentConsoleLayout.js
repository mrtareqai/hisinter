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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentConsoleLayout = void 0;
const react_1 = __importStar(require("react"));
const UnifiedAgentInterface_1 = __importDefault(require("../components/UnifiedAgentInterface"));
const lucide_react_1 = require("lucide-react");
/**
 * AgentConsoleLayout
 * Main layout wrapping unified agent interface with minimal controls
 */
const AgentConsoleLayout = () => {
    const [isMuted, setIsMuted] = (0, react_1.useState)(false);
    const [isPaused, setIsPaused] = (0, react_1.useState)(false);
    const [showSettings, setShowSettings] = (0, react_1.useState)(false);
    return (<div className="flex flex-col h-screen bg-background">
      {/* Top Control Bar */}
      <div className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <lucide_react_1.Menu className="w-5 h-5 cursor-pointer hover:text-primary"/>
          <h1 className="text-lg font-semibold">Sinter AI IDE</h1>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-lg hover:bg-muted transition-colors ${isMuted ? 'text-destructive' : 'text-foreground'}`} title={isMuted ? 'Unmute notifications' : 'Mute notifications'}>
            <lucide_react_1.Volume2 className="w-5 h-5"/>
          </button>

          <button onClick={() => setIsPaused(!isPaused)} className={`p-2 rounded-lg hover:bg-muted transition-colors ${isPaused ? 'text-destructive' : 'text-foreground'}`} title={isPaused ? 'Resume execution' : 'Pause execution'}>
            <lucide_react_1.Pause className="w-5 h-5"/>
          </button>

          <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Fullscreen">
            <lucide_react_1.Maximize2 className="w-5 h-5"/>
          </button>

          <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Settings">
            <lucide_react_1.Settings className="w-5 h-5"/>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent Interface */}
        <div className="flex-1 flex flex-col">
          <UnifiedAgentInterface_1.default />
        </div>

        {/* Settings Sidebar */}
        {showSettings && (<div className="w-64 border-l border-border bg-card overflow-y-auto">
            <SettingsSidebar />
          </div>)}
      </div>

      {/* Status Bar */}
      <div className="border-t border-border bg-card px-6 py-2 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500'}`}/>
            {isPaused ? 'Paused' : 'Running'}
          </div>

          <div>Autonomy: 85%</div>
          <div>Memory: 256MB</div>
        </div>

        <div className="text-xs">Ready for input</div>
      </div>
    </div>);
};
exports.AgentConsoleLayout = AgentConsoleLayout;
/**
 * Settings Sidebar Component
 */
const SettingsSidebar = () => {
    const [autonomyLevel, setAutonomyLevel] = (0, react_1.useState)(85);
    const [autoSave, setAutoSave] = (0, react_1.useState)(true);
    const [verbose, setVerbose] = (0, react_1.useState)(true);
    return (<div className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-foreground mb-3">Agent Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Autonomy Level */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Autonomy Level
          </label>
          <input type="range" min="0" max="100" value={autonomyLevel} onChange={(e) => setAutonomyLevel(parseInt(e.target.value))} className="w-full"/>
          <p className="text-xs text-muted-foreground mt-1">
            {autonomyLevel}% - Lower = more confirmations
          </p>
        </div>

        {/* Auto-Save */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} className="rounded"/>
            <span className="text-sm font-medium text-foreground">
              Auto-save changes
            </span>
          </label>
        </div>

        {/* Verbose Output */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={verbose} onChange={(e) => setVerbose(e.target.checked)} className="rounded"/>
            <span className="text-sm font-medium text-foreground">
              Show detailed reasoning
            </span>
          </label>
        </div>

        {/* Language Selection */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Preferred Language
          </label>
          <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
            <option>JavaScript/React</option>
            <option>Python</option>
            <option>Go</option>
            <option>Rust</option>
            <option>TypeScript</option>
          </select>
        </div>

        {/* Framework Selection */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Preferred Framework
          </label>
          <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
            <option>Next.js</option>
            <option>React</option>
            <option>FastAPI</option>
            <option>Django</option>
            <option>Express</option>
          </select>
        </div>
      </div>

      {/* System Status */}
      <div className="border-t border-border pt-4">
        <h4 className="font-medium text-foreground text-sm mb-3">
          System Status
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Intelligence Systems</span>
            <span className="font-medium">21/21 Active</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Autonomy Score</span>
            <span className="font-medium text-green-600">85%</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Memory Usage</span>
            <span className="font-medium">256MB / 1GB</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Activity</span>
            <span className="font-medium">Just now</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-border pt-4 space-y-2">
        <button className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Clear History
        </button>

        <button className="w-full px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors">
          Export Logs
        </button>
      </div>
    </div>);
};
exports.default = exports.AgentConsoleLayout;
//# sourceMappingURL=AgentConsoleLayout.js.map