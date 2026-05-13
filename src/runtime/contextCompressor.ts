import { OllamaMessage } from '../ai/ollamaClient';

export interface ContextCompressionResult {
    messages: OllamaMessage[];
    droppedMessages: number;
    estimatedChars: number;
    summary: string;
}

export class ContextCompressor {
    compress(messages: OllamaMessage[], maxMessages: number, maxChars: number): ContextCompressionResult {
        const selected: OllamaMessage[] = [];
        let total = 0;

        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            const content = this.trimNoisyContent(message.content);
            const size = content.length;
            if (selected.length >= maxMessages || total + size > maxChars) {
                break;
            }
            selected.unshift({ ...message, content });
            total += size;
        }

        const dropped = Math.max(messages.length - selected.length, 0);
        return {
            messages: selected,
            droppedMessages: dropped,
            estimatedChars: total,
            summary: dropped > 0
                ? `Compressed context: kept ${selected.length} recent scoped messages, dropped ${dropped} stale/noisy messages.`
                : `Scoped context: ${selected.length} messages, ${total} chars.`,
        };
    }

    scopedFileContext(filePath: string, content: string, maxChars: number): string {
        const clean = this.trimNoisyContent(content);
        if (clean.length <= maxChars) {
            return clean;
        }

        const head = clean.slice(0, Math.floor(maxChars * 0.55));
        const tail = clean.slice(clean.length - Math.floor(maxChars * 0.35));
        return `${head}\n\n/* ... compressed middle: ${clean.length - head.length - tail.length} chars omitted ... */\n\n${tail}`;
    }

    private trimNoisyContent(content: string): string {
        if (!content) {
            return '';
        }
        const lines = content.split(/\r?\n/);
        const filtered = lines.filter((line) => {
            const trimmed = line.trim();
            if (trimmed.length === 0) {
                return true;
            }
            if (trimmed.startsWith('STDOUT:') || trimmed.startsWith('STDERR:')) {
                return true;
            }
            if (trimmed.includes('node_modules') || trimmed.includes('package-lock.json')) {
                return false;
            }
            return true;
        });
        return filtered.join('\n').replace(/\n{4,}/g, '\n\n\n');
    }

    /**
     * Filter messages to only those relevant to the given task scope (file paths).
     * Falls back to recent-window compression if no scope is provided.
     */
    scopedTaskContext(
        messages: OllamaMessage[],
        scope: string[],
        maxMessages: number,
        maxChars: number,
    ): ContextCompressionResult {
        if (!scope || scope.length === 0) {
            return this.compress(messages, maxMessages, maxChars);
        }

        const scopePatterns = scope.map((s) => s.toLowerCase());
        const relevant: OllamaMessage[] = [];
        let total = 0;

        // Always keep system messages and recent user messages
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            const lower = msg.content.toLowerCase();
            const isSystem = msg.role === 'system';
            const isRecent = i >= messages.length - 4;
            const matchesScope = scopePatterns.some((p) => lower.includes(p));

            if (isSystem || isRecent || matchesScope) {
                const content = this.trimNoisyContent(msg.content);
                if (relevant.length >= maxMessages || total + content.length > maxChars) {
                    break;
                }
                relevant.unshift({ ...msg, content });
                total += content.length;
            }
        }

        const dropped = Math.max(messages.length - relevant.length, 0);
        return {
            messages: relevant,
            droppedMessages: dropped,
            estimatedChars: total,
            summary: `Scoped context: ${relevant.length} messages for ${scope.length} files, dropped ${dropped} out-of-scope messages.`,
        };
    }
}
