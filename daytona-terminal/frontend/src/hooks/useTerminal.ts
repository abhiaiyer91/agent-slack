import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import type { WSMessage, CommandBlock, AISuggestion } from '../types';

interface UseTerminalOptions {
  sessionId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onBlock?: (block: CommandBlock) => void;
  onSuggestion?: (suggestion: AISuggestion) => void;
}

interface UseTerminalReturn {
  terminalRef: React.RefObject<HTMLDivElement>;
  terminal: Terminal | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  write: (data: string) => void;
  resize: () => void;
  search: (term: string) => boolean;
  searchNext: () => boolean;
  searchPrevious: () => boolean;
  requestCompletions: (partial: string) => void;
  requestAnalysis: (output: string) => void;
}

// Beautiful Tokyo Night theme
const THEME = {
  background: '#1a1b26',
  foreground: '#c0caf5',
  cursor: '#c0caf5',
  cursorAccent: '#1a1b26',
  selectionBackground: '#33467c',
  selectionForeground: '#c0caf5',
  black: '#15161e',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#a9b1d6',
  brightBlack: '#414868',
  brightRed: '#f7768e',
  brightGreen: '#9ece6a',
  brightYellow: '#e0af68',
  brightBlue: '#7aa2f7',
  brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff',
  brightWhite: '#c0caf5',
};

export function useTerminal(options: UseTerminalOptions): UseTerminalReturn {
  const { sessionId, onConnect, onDisconnect, onError, onBlock, onSuggestion } = options;

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || terminalInstance.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
      fontSize: 14,
      fontWeight: '400',
      fontWeightBold: '600',
      lineHeight: 1.4,
      letterSpacing: 0.5,
      theme: THEME,
      scrollback: 10000,
      allowProposedApi: true,
      macOptionIsMeta: true,
      macOptionClickForcesSelection: true,
    });

    // Add addons
    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    const search = new SearchAddon();

    term.loadAddon(fit);
    term.loadAddon(webLinks);
    term.loadAddon(search);

    fitAddon.current = fit;
    searchAddon.current = search;

    // Open terminal
    term.open(terminalRef.current);
    fit.fit();

    terminalInstance.current = term;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (fitAddon.current) {
          fitAddon.current.fit();
          sendResize();
        }
      });
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      terminalInstance.current = null;
    };
  }, []);

  // Send resize to server
  const sendResize = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && terminalInstance.current) {
      const { cols, rows } = terminalInstance.current;
      const message: WSMessage = { type: 'resize', cols, rows };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal/${sessionId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      onConnect?.();
      setTimeout(sendResize, 100);
    };

    ws.onclose = () => {
      setIsConnected(false);
      onDisconnect?.();
    };

    ws.onerror = () => {
      onError?.('WebSocket connection error');
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'output':
            if (message.data && terminalInstance.current) {
              terminalInstance.current.write(message.data);
            }
            break;

          case 'connected':
            console.log('Terminal connected:', message.sessionId);
            break;

          case 'error':
            console.error('Terminal error:', message.message);
            onError?.(message.message || 'Unknown error');
            break;

          case 'block':
            if (message.block) {
              onBlock?.(message.block);
            }
            break;

          case 'suggestion':
            if (message.suggestion) {
              onSuggestion?.(message.suggestion);
            }
            break;

          case 'pong':
            // Heartbeat response
            break;
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    wsRef.current = ws;

    // Handle terminal input
    if (terminalInstance.current) {
      terminalInstance.current.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          const message: WSMessage = { type: 'input', data };
          ws.send(JSON.stringify(message));
        }
      });
    }

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      ws.close();
    };
  }, [sessionId, onConnect, onDisconnect, onError, onBlock, onSuggestion, sendResize]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Write to terminal
  const write = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WSMessage = { type: 'input', data };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Resize terminal
  const resize = useCallback(() => {
    if (fitAddon.current) {
      fitAddon.current.fit();
      sendResize();
    }
  }, [sendResize]);

  // Request AI completions
  const requestCompletions = useCallback((partial: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WSMessage = { type: 'complete', data: partial };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Request AI analysis
  const requestAnalysis = useCallback((output: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WSMessage = { type: 'analyze', data: output };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Search functions
  const search = useCallback((term: string): boolean => {
    return searchAddon.current?.findNext(term) ?? false;
  }, []);

  const searchNext = useCallback((): boolean => {
    return searchAddon.current?.findNext('') ?? false;
  }, []);

  const searchPrevious = useCallback((): boolean => {
    return searchAddon.current?.findPrevious('') ?? false;
  }, []);

  return {
    terminalRef,
    terminal: terminalInstance.current,
    isConnected,
    connect,
    disconnect,
    write,
    resize,
    search,
    searchNext,
    searchPrevious,
    requestCompletions,
    requestAnalysis,
  };
}
