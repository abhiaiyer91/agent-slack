import { useEffect, useState, useCallback } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { CommandBlockView } from './CommandBlock';
import { AISuggestionBanner } from './AISuggestionBanner';
import type { CommandBlock, AISuggestion } from '../types';
import 'xterm/css/xterm.css';

interface TerminalProps {
  sessionId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function Terminal({ sessionId, onConnected, onDisconnected }: TerminalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [blocks, setBlocks] = useState<CommandBlock[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState<AISuggestion | null>(null);
  const [showBlocks, setShowBlocks] = useState(false);

  const handleBlock = useCallback((block: CommandBlock) => {
    setBlocks(prev => [...prev.slice(-50), block]); // Keep last 50 blocks
  }, []);

  const handleSuggestion = useCallback((suggestion: AISuggestion) => {
    setCurrentSuggestion(suggestion);
    // Auto-hide after 15 seconds
    setTimeout(() => setCurrentSuggestion(null), 15000);
  }, []);

  const {
    terminalRef,
    isConnected,
    connect,
    disconnect,
    write,
    search,
    searchNext,
    searchPrevious,
  } = useTerminal({
    sessionId,
    onConnect: onConnected,
    onDisconnect: onDisconnected,
    onError: (error) => console.error('Terminal error:', error),
    onBlock: handleBlock,
    onSuggestion: handleSuggestion,
  });

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F for search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
      // Escape to close search/suggestions
      if (e.key === 'Escape') {
        if (showSearch) setShowSearch(false);
        if (currentSuggestion) setCurrentSuggestion(null);
      }
      // Ctrl+B for blocks panel
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setShowBlocks((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, currentSuggestion]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term) search(term);
  };

  // Execute suggestion command
  const executeSuggestion = (command: string) => {
    write(command + '\n');
    setCurrentSuggestion(null);
  };

  return (
    <div className="relative h-full w-full bg-[#1a1b26] flex">
      {/* Blocks panel */}
      {showBlocks && (
        <div className="w-80 border-r border-white/10 overflow-y-auto bg-[#16161e]">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-white/70">Command History</span>
            <button
              onClick={() => setShowBlocks(false)}
              className="text-white/40 hover:text-white/80"
            >
              ✕
            </button>
          </div>
          <div className="p-2 space-y-2">
            {blocks.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No commands yet</p>
            ) : (
              blocks.map((block) => (
                <CommandBlockView
                  key={block.id}
                  block={block}
                  onRunAgain={() => write(block.command + '\n')}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Main terminal area */}
      <div className="flex-1 relative">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-[#1a1b26] to-transparent">
          <div className="flex items-center gap-3">
            {/* Traffic lights */}
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            
            {/* Connection status */}
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-white/50">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Blocks toggle */}
            <button
              onClick={() => setShowBlocks(!showBlocks)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                showBlocks
                  ? 'bg-indigo-500/30 text-indigo-300'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
              title="Command blocks (Ctrl+B)"
            >
              ☰ Blocks
            </button>

            {/* Search toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                showSearch
                  ? 'bg-indigo-500/30 text-indigo-300'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
              title="Search (Ctrl+F)"
            >
              🔍
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="absolute top-12 right-4 z-20 flex items-center gap-2 rounded-lg bg-[#16161e] px-3 py-2 shadow-xl border border-white/10">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search..."
              className="bg-transparent text-sm text-white outline-none placeholder:text-white/30 w-48"
              autoFocus
            />
            <button
              onClick={() => searchPrevious()}
              className="text-white/50 hover:text-white"
              title="Previous (Shift+Enter)"
            >
              ↑
            </button>
            <button
              onClick={() => searchNext()}
              className="text-white/50 hover:text-white"
              title="Next (Enter)"
            >
              ↓
            </button>
            <button
              onClick={() => setShowSearch(false)}
              className="text-white/50 hover:text-white"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        )}

        {/* AI Suggestion Banner */}
        {currentSuggestion && (
          <AISuggestionBanner
            suggestion={currentSuggestion}
            onExecute={executeSuggestion}
            onDismiss={() => setCurrentSuggestion(null)}
          />
        )}

        {/* Terminal container */}
        <div
          ref={terminalRef}
          className="h-full w-full pt-10 terminal-container"
        />
      </div>
    </div>
  );
}
