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
exports.GlobalStateManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class GlobalStateManager {
    state;
    stateHistory = [];
    eventListeners = new Map();
    persistencePath;
    constructor(projectRoot) {
        this.persistencePath = path.join(projectRoot, '.sinter', 'global-state.json');
        this.state = this.initializeState();
        this.loadStateFromDisk();
    }
    initializeState() {
        return {
            timestamp: Date.now(),
            projectStructure: {},
            dependencies: {},
            lastActions: [],
            buildStatus: 'unknown',
            errors: [],
            executionMetrics: {
                totalTasks: 0,
                completedTasks: 0,
                failedTasks: 0,
                averageResponseTime: 0,
            },
        };
    }
    loadStateFromDisk() {
        try {
            if (fs.existsSync(this.persistencePath)) {
                const data = fs.readFileSync(this.persistencePath, 'utf-8');
                this.state = JSON.parse(data);
            }
        }
        catch (error) {
            console.error('[Sinter] Failed to load global state:', error);
        }
    }
    persistToDisk() {
        try {
            const dir = path.dirname(this.persistencePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.persistencePath, JSON.stringify(this.state, null, 2));
        }
        catch (error) {
            console.error('[Sinter] Failed to persist global state:', error);
        }
    }
    updateProjectStructure(structure) {
        this.state.projectStructure = structure;
        this.state.timestamp = Date.now();
        this.emit('structure-updated', structure);
        this.persistToDisk();
    }
    updateDependencies(deps) {
        this.state.dependencies = deps;
        this.state.timestamp = Date.now();
        this.emit('dependencies-updated', deps);
        this.persistToDisk();
    }
    recordAction(action, result) {
        this.state.lastActions.push({
            action,
            timestamp: Date.now(),
            result,
        });
        // Keep only last 100 actions
        if (this.state.lastActions.length > 100) {
            this.state.lastActions = this.state.lastActions.slice(-100);
        }
        this.emit('action-recorded', { action, result });
        this.persistToDisk();
    }
    setBuildStatus(status) {
        this.state.buildStatus = status;
        this.state.timestamp = Date.now();
        this.emit('build-status-changed', status);
        this.persistToDisk();
    }
    recordError(message, stack, context) {
        this.state.errors.push({
            timestamp: Date.now(),
            message,
            stack,
            context,
        });
        // Keep only last 50 errors
        if (this.state.errors.length > 50) {
            this.state.errors = this.state.errors.slice(-50);
        }
        this.emit('error-recorded', { message, stack, context });
        this.persistToDisk();
    }
    updateExecutionMetrics(metrics) {
        this.state.executionMetrics = {
            ...this.state.executionMetrics,
            ...metrics,
        };
        this.state.timestamp = Date.now();
        this.emit('metrics-updated', this.state.executionMetrics);
        this.persistToDisk();
    }
    getState() {
        return { ...this.state };
    }
    getLastActions(count = 10) {
        return this.state.lastActions.slice(-count);
    }
    getRecentErrors(count = 10) {
        return this.state.errors.slice(-count);
    }
    rollback(stepsBack = 1) {
        if (this.stateHistory.length >= stepsBack) {
            this.state = this.stateHistory[this.stateHistory.length - stepsBack];
            this.emit('state-rolled-back', { stepsBack });
            this.persistToDisk();
        }
    }
    saveSnapshot() {
        this.stateHistory.push(JSON.parse(JSON.stringify(this.state)));
        // Keep only last 20 snapshots
        if (this.stateHistory.length > 20) {
            this.stateHistory = this.stateHistory.slice(-20);
        }
    }
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }
    off(event, listener) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((listener) => {
                try {
                    listener(data);
                }
                catch (error) {
                    console.error(`[Sinter] Error in event listener for ${event}:`, error);
                }
            });
        }
    }
}
exports.GlobalStateManager = GlobalStateManager;
exports.default = GlobalStateManager;
//# sourceMappingURL=globalStateManager.js.map