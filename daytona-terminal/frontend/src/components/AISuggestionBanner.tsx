import type { AISuggestion } from '../types';

interface AISuggestionBannerProps {
  suggestion: AISuggestion;
  onExecute: (command: string) => void;
  onDismiss: () => void;
}

export function AISuggestionBanner({ suggestion, onExecute, onDismiss }: AISuggestionBannerProps) {
  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 animate-slide-up">
      <div className="rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="text-sm font-medium text-white/80">AI Suggestion</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-white/70 mb-3">{suggestion.text}</p>

          {/* Suggested commands */}
          {suggestion.commands.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestion.commands.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => onExecute(cmd)}
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/30 transition-all"
                >
                  <span className="text-indigo-400 group-hover:text-indigo-300">▶</span>
                  <code className="text-sm text-white/80 font-mono">{cmd}</code>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
