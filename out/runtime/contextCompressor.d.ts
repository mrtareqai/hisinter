import { OllamaMessage } from '../ai/ollamaClient';
export interface ContextCompressionResult {
    messages: OllamaMessage[];
    droppedMessages: number;
    estimatedChars: number;
    summary: string;
}
export declare class ContextCompressor {
    compress(messages: OllamaMessage[], maxMessages: number, maxChars: number): ContextCompressionResult;
    scopedFileContext(filePath: string, content: string, maxChars: number): string;
    private trimNoisyContent;
    /**
     * Filter messages to only those relevant to the given task scope (file paths).
     * Falls back to recent-window compression if no scope is provided.
     */
    scopedTaskContext(messages: OllamaMessage[], scope: string[], maxMessages: number, maxChars: number): ContextCompressionResult;
}
