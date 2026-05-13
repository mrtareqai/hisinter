import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Send, Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'thinking' | 'result';
  content: string;
  timestamp: number;
  metadata?: any;
}

/**
 * UnifiedAgentInterface
 * Single seamless agent experience - no panel switching
 */
export const UnifiedAgentInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate agent processing
    setTimeout(() => {
      const thinkingMessage: Message = {
        id: `thinking-${Date.now()}`,
        type: 'thinking',
        content: `I'm analyzing: "${input}". Breaking this down into achievable steps...`,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, thinkingMessage]);

      // Simulate result
      setTimeout(() => {
        const resultMessage: Message = {
          id: `result-${Date.now()}`,
          type: 'result',
          content: `I've identified 3 key steps for: ${input}. Ready to execute when you are.`,
          timestamp: Date.now(),
          metadata: {
            steps: ['Analysis', 'Planning', 'Execution'],
            confidence: 0.85,
          },
        };

        setMessages((prev) => [...prev, resultMessage]);
        setIsLoading(false);
      }, 1500);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold">Sinter AI IDE</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Autonomous development agent
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-lg font-semibold mb-2">Welcome to Sinter AI</p>
              <p className="text-muted-foreground max-w-md">
                Describe what you want to build, and I'll autonomously generate
                code, set up your project, and handle the entire development
                workflow.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCollapseThinking={() => {
                  if (message.type === 'thinking') {
                    setShowThinking(false);
                  }
                }}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-sm">Agent is processing...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to build..."
            className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

/**
 * MessageBubble component
 */
interface MessageBubbleProps {
  message: Message;
  onCollapseThinking?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCollapseThinking,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const bgColor = {
    user: 'bg-primary text-primary-foreground ml-auto',
    agent: 'bg-muted text-foreground',
    thinking: 'bg-blue-50 text-foreground border border-blue-200',
    result: 'bg-green-50 text-foreground border border-green-200',
  }[message.type];

  const maxWidth = message.type === 'user' ? 'max-w-md' : 'max-w-2xl';

  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`${bgColor} ${maxWidth} rounded-lg px-4 py-3`}>
        <div className="flex items-start gap-2">
          {message.type === 'thinking' && <Loader className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" />}
          {message.type === 'result' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />}

          <div className="flex-1">
            <p className="text-sm">{message.content}</p>

            {message.metadata?.steps && (
              <div className="mt-3 space-y-2">
                {message.metadata.steps.map((step: string, idx: number) => (
                  <div
                    key={idx}
                    className="text-xs p-2 bg-background rounded flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded-full border border-primary flex items-center justify-center text-xs font-semibold">
                      {idx + 1}
                    </div>
                    {step}
                  </div>
                ))}
              </div>
            )}

            {message.metadata?.confidence && (
              <div className="mt-2 text-xs opacity-70">
                Confidence: {(message.metadata.confidence * 100).toFixed(0)}%
              </div>
            )}
          </div>

          {message.type === 'thinking' && (
            <button
              onClick={() => {
                setIsCollapsed(!isCollapsed);
                onCollapseThinking?.();
              }}
              className="flex-shrink-0 mt-0.5 hover:opacity-70"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isCollapsed ? '-rotate-90' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedAgentInterface;
