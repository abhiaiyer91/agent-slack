import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAIStore } from '../stores/aiStore';
import type { AICommandResponse } from '../types';
import clsx from 'clsx';

interface AIPanelProps {
  sessionId: string;
  onExecuteCommand?: (command: string) => void;
  className?: string;
}

export function AIPanel({ sessionId, onExecuteCommand, className }: AIPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentConversation,
    responses,
    loading,
    error,
    createConversation,
    sendMessage,
    clearConversation,
    clearError,
  } = useAIStore();

  // Create conversation on mount
  useEffect(() => {
    if (!currentConversation && sessionId) {
      createConversation(sessionId).catch(console.error);
    }
  }, [sessionId, currentConversation, createConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [responses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    try {
      await sendMessage({
        prompt: prompt.trim(),
        include_terminal_context: includeContext,
      });
      setPrompt('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleExecuteCommand = (command: string) => {
    onExecuteCommand?.(command);
  };

  return (
    <div className={clsx('flex flex-col bg-terminal-black', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-selection/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h2 className="font-semibold text-terminal-fg">AI Assistant</h2>
          {currentConversation && (
            <span className="text-xs text-terminal-fg/50">
              ({currentConversation.assistant_type})
            </span>
          )}
        </div>
        <button
          onClick={() => clearConversation()}
          className="text-xs text-terminal-fg/50 hover:text-terminal-fg"
          title="Clear conversation"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="ai-panel flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 rounded bg-terminal-red/20 px-3 py-2 text-sm text-terminal-red">
            {error}
            <button
              onClick={clearError}
              className="ml-2 text-terminal-red/70 hover:text-terminal-red"
            >
              ✕
            </button>
          </div>
        )}

        {responses.length === 0 ? (
          <div className="text-center text-terminal-fg/50">
            <p className="mb-2">Ask me anything about your code!</p>
            <p className="text-xs">
              I can help with debugging, writing code, running commands, and more.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((response, index) => (
              <AIResponse
                key={index}
                response={response}
                onExecuteCommand={handleExecuteCommand}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-terminal-selection/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-terminal-fg/70">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="rounded border-terminal-fg/30"
            />
            Include terminal context
          </label>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask the AI assistant..."
            className="flex-1 rounded bg-terminal-bg px-3 py-2 text-sm text-terminal-fg outline-none ring-1 ring-terminal-selection/30 focus:ring-daytona-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="rounded bg-daytona-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface AIResponseProps {
  response: AICommandResponse;
  onExecuteCommand?: (command: string) => void;
}

function AIResponse({ response, onExecuteCommand }: AIResponseProps) {
  return (
    <div className="ai-response rounded bg-terminal-bg/50 p-4">
      <ReactMarkdown
        className="prose prose-invert prose-sm max-w-none"
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            
            if (isInline) {
              return (
                <code className="rounded bg-terminal-black px-1 py-0.5 text-terminal-cyan" {...props}>
                  {children}
                </code>
              );
            }

            const code = String(children).replace(/\n$/, '');
            const language = match[1];

            return (
              <div className="relative">
                <div className="absolute right-2 top-2 flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="rounded bg-terminal-selection/50 px-2 py-1 text-xs text-terminal-fg/70 hover:bg-terminal-selection hover:text-terminal-fg"
                    title="Copy"
                  >
                    📋
                  </button>
                  {(language === 'bash' || language === 'sh' || language === 'shell') && (
                    <button
                      onClick={() => onExecuteCommand?.(code)}
                      className="rounded bg-daytona-primary/50 px-2 py-1 text-xs text-white hover:bg-daytona-primary"
                      title="Run in terminal"
                    >
                      ▶ Run
                    </button>
                  )}
                </div>
                <pre className="overflow-x-auto rounded bg-terminal-black p-4">
                  <code className={`language-${language}`}>{code}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {response.message}
      </ReactMarkdown>

      {response.suggested_commands.length > 0 && (
        <div className="mt-4 border-t border-terminal-selection/30 pt-4">
          <h4 className="mb-2 text-xs font-semibold text-terminal-fg/70">
            Suggested Commands:
          </h4>
          <div className="flex flex-wrap gap-2">
            {response.suggested_commands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => onExecuteCommand?.(cmd)}
                className="rounded bg-terminal-selection/50 px-3 py-1 text-xs text-terminal-fg hover:bg-terminal-selection"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
