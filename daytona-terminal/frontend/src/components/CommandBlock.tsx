import { useState } from 'react';
import type { CommandBlock } from '../types';
import clsx from 'clsx';

interface CommandBlockViewProps {
  block: CommandBlock;
  onRunAgain: () => void;
}

export function CommandBlockView({ block, onRunAgain }: CommandBlockViewProps) {
  const [expanded, setExpanded] = useState(false);

  const hasError = block.analysis?.hasError;
  const exitCode = block.exitCode;

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const duration = block.endTime
    ? Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 1000)
    : null;

  return (
    <div
      className={clsx(
        'rounded-lg border overflow-hidden transition-all',
        hasError
          ? 'border-red-500/30 bg-red-500/5'
          : exitCode === 0
          ? 'border-green-500/20 bg-green-500/5'
          : 'border-white/10 bg-white/5'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Status indicator */}
          <div
            className={clsx(
              'w-2 h-2 rounded-full flex-shrink-0',
              hasError ? 'bg-red-400' : exitCode === 0 ? 'bg-green-400' : 'bg-yellow-400'
            )}
          />

          {/* Command */}
          <code className="text-sm text-white/90 truncate font-mono">{block.command}</code>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Duration */}
          {duration !== null && (
            <span className="text-xs text-white/40">{duration}s</span>
          )}

          {/* Time */}
          <span className="text-xs text-white/40">{formatTime(block.startTime)}</span>

          {/* Expand icon */}
          <span className="text-white/40">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/10">
          {/* Output */}
          {block.output && (
            <pre className="p-3 text-xs text-white/70 font-mono overflow-x-auto max-h-48 overflow-y-auto bg-black/20">
              {block.output.slice(0, 2000)}
              {block.output.length > 2000 && (
                <span className="text-white/30">... (truncated)</span>
              )}
            </pre>
          )}

          {/* Error analysis */}
          {block.analysis?.hasError && block.analysis.suggestion && (
            <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/20">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div>
                  <p className="text-sm text-white/80">{block.analysis.suggestion}</p>
                  {block.analysis.errorType && (
                    <span className="text-xs text-red-400/70 mt-1 inline-block">
                      {block.analysis.errorType}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-3 py-2 flex items-center gap-2 bg-black/20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRunAgain();
              }}
              className="text-xs px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
            >
              ▶ Run again
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(block.command);
              }}
              className="text-xs px-2 py-1 rounded bg-white/10 text-white/60 hover:bg-white/20"
            >
              📋 Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
