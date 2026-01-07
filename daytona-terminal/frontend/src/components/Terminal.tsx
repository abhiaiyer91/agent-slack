import { useEffect, useState } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import 'xterm/css/xterm.css';

interface TerminalProps {
  sessionId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function Terminal({ sessionId, onConnected, onDisconnected }: TerminalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const {
    terminalRef,
    isConnected,
    connect,
    disconnect,
    search,
    searchNext,
    searchPrevious,
  } = useTerminal({
    sessionId,
    onConnect: onConnected,
    onDisconnect: onDisconnected,
    onError: (error) => console.error('Terminal error:', error),
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
      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
      // Enter to search next
      if (e.key === 'Enter' && showSearch) {
        e.preventDefault();
        if (e.shiftKey) {
          searchPrevious();
        } else {
          searchNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, searchNext, searchPrevious]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term) {
      search(term);
    }
  };

  return (
    <div className="relative h-full w-full bg-terminal-bg">
      {/* Connection status indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-xs text-terminal-fg/50">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2 rounded bg-terminal-black/80 px-3 py-2">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search..."
            className="bg-transparent text-sm text-terminal-fg outline-none placeholder:text-terminal-fg/30"
            autoFocus
          />
          <button
            onClick={() => searchPrevious()}
            className="text-terminal-fg/50 hover:text-terminal-fg"
            title="Previous (Shift+Enter)"
          >
            ↑
          </button>
          <button
            onClick={() => searchNext()}
            className="text-terminal-fg/50 hover:text-terminal-fg"
            title="Next (Enter)"
          >
            ↓
          </button>
          <button
            onClick={() => setShowSearch(false)}
            className="text-terminal-fg/50 hover:text-terminal-fg"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>
      )}

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="terminal-container h-full w-full"
      />
    </div>
  );
}
