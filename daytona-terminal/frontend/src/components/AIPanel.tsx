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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        includeTerminalContext: includeContext,
      });
      setPrompt('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={clsx('flex flex-col bg-[#16161e]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h2 className="font-semibold text-white/90">AI Assistant</h2>
            {currentConversation && (
              <span className="text-xs text-white/40">
                {currentConversation.assistantType} • {currentConversation.model}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => clearConversation()}
          className="text-xs text-white/40 hover:text-white/80 px-2 py-1 rounded hover:bg-white/5"
          title="Clear conversation"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button onClick={clearError} className="text-red-400/70 hover:text-red-300">
                ✕
              </button>
            </div>
          </div>
        )}

        {responses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <span className="text-3xl">✨</span>
            </div>
            <h3 className="text-lg font-medium text-white/80 mb-2">Ask me anything</h3>
            <p className="text-sm text-white/40 max-w-xs">
              I can help with debugging, writing code, running commands, and understanding errors.
            </p>
            
            {/* Quick prompts */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                'How do I fix this error?',
                'Explain this code',
                'Write a git command to...',
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          responses.map((response, index) => (
            <AIResponse key={index} response={response} onExecute={onExecuteCommand} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 mb-3">
            <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50"
              />
              Include terminal context
            </label>
          </div>
          
          <div className="relative">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI..."
              rows={2}
              className="w-full rounded-lg bg-white/5 px-4 py-3 pr-12 text-sm text-white/90 outline-none ring-1 ring-white/10 focus:ring-indigo-500/50 resize-none placeholder:text-white/30"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-400 transition-colors"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AIResponseProps {
  response: AICommandResponse;
  onExecute?: (command: string) => void;
}

function AIResponse({ response, onExecute }: AIResponseProps) {
  return (
    <div className="rounded-xl bg-white/5 overflow-hidden">
      {/* Message */}
      <div className="p-4 prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match;

              if (isInline) {
                return (
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-300 text-xs" {...props}>
                    {children}
                  </code>
                );
              }

              const code = String(children).replace(/\n$/, '');
              const language = match[1];

              return (
                <div className="relative group my-3">
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigator.clipboard.writeText(code)}
                      className="px-2 py-1 rounded bg-white/10 text-xs text-white/60 hover:text-white/80"
                    >
                      Copy
                    </button>
                    {['bash', 'sh', 'shell', 'zsh'].includes(language) && (
                      <button
                        onClick={() => onExecute?.(code)}
                        className="px-2 py-1 rounded bg-indigo-500/30 text-xs text-indigo-300 hover:bg-indigo-500/50"
                      >
                        Run
                      </button>
                    )}
                  </div>
                  <pre className="rounded-lg bg-[#0d0d12] p-4 overflow-x-auto">
                    <code className="text-sm font-mono">{code}</code>
                  </pre>
                </div>
              );
            },
            p({ children }) {
              return <p className="text-white/70 text-sm leading-relaxed mb-2">{children}</p>;
            },
            ul({ children }) {
              return <ul className="text-white/70 text-sm list-disc list-inside space-y-1 mb-2">{children}</ul>;
            },
            ol({ children }) {
              return <ol className="text-white/70 text-sm list-decimal list-inside space-y-1 mb-2">{children}</ol>;
            },
          }}
        >
          {response.message}
        </ReactMarkdown>
      </div>

      {/* Suggested commands */}
      {response.suggestedCommands.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {response.suggestedCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => onExecute?.(cmd)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors text-sm"
              >
                <span className="text-indigo-400">▶</span>
                <code className="font-mono">{cmd}</code>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
