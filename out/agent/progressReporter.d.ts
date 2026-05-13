import { AgentEvent } from './agentLoop';
export declare class ProgressReporter {
    private stepCount;
    private emit;
    exploring(path: string): AgentEvent;
    foundStructure(dirs: number, files: number): AgentEvent;
    readingFile(file: string, lines: number): AgentEvent;
    readingConfig(file: string): AgentEvent;
    analyzingArchitecture(): AgentEvent;
    buildingDependencyGraph(): AgentEvent;
    analyzingPatterns(): AgentEvent;
    foundStats(files: number, lines: number, issues: number): AgentEvent;
    buildingPlan(): AgentEvent;
    planPhase(phase: number, name: string): AgentEvent;
    executingStep(step: string): AgentEvent;
    creatingFile(path: string): AgentEvent;
    modifyingFile(path: string): AgentEvent;
    verifying(what: string): AgentEvent;
    done(summary: string): AgentEvent;
    error(message: string): AgentEvent;
    thinking(message: string): AgentEvent;
    getStepCount(): number;
}
