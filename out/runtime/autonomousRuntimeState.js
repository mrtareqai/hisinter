"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousRuntimeState = void 0;
class AutonomousRuntimeState {
    goal = '';
    executionState = 'idle';
    tasks = [];
    failures = [];
    checkpoints = [];
    recentEvents = [];
    signatures = [];
    startGoal(goal) {
        this.goal = goal.trim();
        this.executionState = 'planning';
        this.tasks = [];
        this.failures = [];
        this.checkpoints = [];
        this.recentEvents = [];
        this.signatures = [];
        return this.addTask(this.titleFromGoal(goal), []);
    }
    setExecutionState(state) {
        this.executionState = state;
        this.addEvent(`state:${state}`);
    }
    addTask(title, scope = []) {
        const now = Date.now();
        const task = {
            id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
            title,
            scope,
            status: 'pending',
            attempts: 0,
            createdAt: now,
            updatedAt: now,
        };
        this.tasks.push(task);
        this.addEvent(`task-created:${title}`);
        return task;
    }
    currentTask() {
        return this.tasks.find((task) => task.status === 'running' || task.status === 'validating' || task.status === 'retrying')
            || this.tasks.find((task) => task.status === 'pending')
            || this.tasks[this.tasks.length - 1];
    }
    startTask(taskId) {
        const task = taskId ? this.tasks.find((item) => item.id === taskId) : this.currentTask();
        if (!task) {
            return undefined;
        }
        task.status = 'running';
        task.attempts += 1;
        task.updatedAt = Date.now();
        this.executionState = 'executing';
        this.addEvent(`task-running:${task.title}`);
        return task;
    }
    markValidating(taskId) {
        const task = taskId ? this.tasks.find((item) => item.id === taskId) : this.currentTask();
        if (task) {
            task.status = 'validating';
            task.updatedAt = Date.now();
        }
        this.executionState = 'validating';
        this.addEvent('validation-started');
    }
    completeTask(summary, taskId) {
        const task = taskId ? this.tasks.find((item) => item.id === taskId) : this.currentTask();
        if (task) {
            task.status = 'completed';
            task.validationSummary = summary;
            task.updatedAt = Date.now();
        }
        this.executionState = this.tasks.some((item) => item.status === 'pending') ? 'executing' : 'completed';
        this.addEvent(`task-completed:${summary}`);
    }
    failTask(message, taskId) {
        const task = taskId ? this.tasks.find((item) => item.id === taskId) : this.currentTask();
        if (task) {
            task.status = 'failed';
            task.lastError = message;
            task.updatedAt = Date.now();
        }
        this.executionState = 'failed';
        this.addEvent(`task-failed:${message}`);
    }
    markRetry(strategy, taskId) {
        const task = taskId ? this.tasks.find((item) => item.id === taskId) : this.currentTask();
        if (task) {
            task.status = 'retrying';
            task.attempts += 1;
            task.updatedAt = Date.now();
        }
        this.executionState = 'retrying';
        this.addEvent(`retry:${strategy}`);
    }
    pauseTask(reason, taskId) {
        const task = taskId ? this.tasks.find((item) => item.id === taskId) : this.currentTask();
        if (task) {
            task.status = 'blocked';
            task.lastError = `Paused: ${reason}`;
            task.updatedAt = Date.now();
        }
        this.executionState = 'paused';
        this.addEvent(`paused:${reason}`);
    }
    resumeTask(taskId) {
        const task = taskId ? this.tasks.find((item) => item.id === taskId) : this.tasks.find((t) => t.status === 'blocked');
        if (task) {
            task.status = 'running';
            task.updatedAt = Date.now();
        }
        this.executionState = 'executing';
        this.addEvent('resumed');
        return task;
    }
    recordFailure(taskId, signature, message, strategy) {
        this.failures.push({
            taskId,
            signature,
            message,
            strategy,
            timestamp: Date.now(),
        });
        if (this.failures.length > 50) {
            this.failures = this.failures.slice(-50);
        }
    }
    createCheckpoint(label, summary) {
        const checkpoint = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            label,
            taskIds: this.tasks.map((task) => task.id),
            timestamp: Date.now(),
            summary,
        };
        this.checkpoints.push(checkpoint);
        if (this.checkpoints.length > 20) {
            this.checkpoints = this.checkpoints.slice(-20);
        }
        this.addEvent(`checkpoint:${label}`);
        return checkpoint;
    }
    detectLoop(signature) {
        this.signatures.push(signature);
        if (this.signatures.length > 16) {
            this.signatures = this.signatures.slice(-16);
        }
        const recent = this.signatures.slice(-8);
        const count = recent.filter((item) => item === signature).length;
        return count >= 3;
    }
    getRetryGuidance() {
        if (this.failures.length === 0) {
            return '';
        }
        const recent = this.failures.slice(-5).map((failure) => `- Avoid repeating ${failure.signature}: failed with "${failure.message}". Try ${failure.strategy}.`);
        return `\n[Failure Memory]\n${recent.join('\n')}\n`;
    }
    snapshot() {
        const completed = this.tasks.filter((task) => task.status === 'completed').length;
        const failed = this.tasks.filter((task) => task.status === 'failed' || task.status === 'blocked').length;
        const pending = this.tasks.filter((task) => task.status === 'pending' || task.status === 'running' || task.status === 'validating' || task.status === 'retrying').length;
        const progress = this.tasks.length === 0 ? 0 : Math.round((completed / this.tasks.length) * 100);
        return {
            goal: this.goal,
            progress,
            executionState: this.executionState,
            completed,
            failed,
            pending,
            retryCount: this.tasks.reduce((sum, task) => sum + Math.max(task.attempts - 1, 0), 0),
            tasks: this.tasks.map((task) => ({ ...task, scope: [...task.scope] })),
            failures: [...this.failures],
            checkpoints: [...this.checkpoints],
            recentEvents: [...this.recentEvents],
        };
    }
    buildPromptContext() {
        const snapshot = this.snapshot();
        if (!snapshot.goal) {
            return '';
        }
        const taskLines = snapshot.tasks.slice(-8).map((task) => `- [${task.status}] ${task.title} (attempts: ${task.attempts})`);
        return [
            '\n[Autonomous Runtime State]',
            `Goal: ${snapshot.goal}`,
            `Progress: ${snapshot.progress}% (${snapshot.completed} done, ${snapshot.pending} active/pending, ${snapshot.failed} failed)`,
            `Execution: ${snapshot.executionState}`,
            taskLines.length ? `Tasks:\n${taskLines.join('\n')}` : '',
            this.getRetryGuidance(),
            '[/Autonomous Runtime State]\n',
        ].filter(Boolean).join('\n');
    }
    addEvent(event) {
        this.recentEvents.push(`${new Date().toISOString()} ${event}`);
        if (this.recentEvents.length > 30) {
            this.recentEvents = this.recentEvents.slice(-30);
        }
    }
    titleFromGoal(goal) {
        const normalized = goal.replace(/\s+/g, ' ').trim();
        return normalized.length > 70 ? `${normalized.slice(0, 67)}...` : normalized || 'Autonomous task';
    }
}
exports.AutonomousRuntimeState = AutonomousRuntimeState;
//# sourceMappingURL=autonomousRuntimeState.js.map