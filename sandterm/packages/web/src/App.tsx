import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

const API = '/api/v1';

interface Sandbox {
  id: string;
  name: string;
  status: string;
}

interface Suggestion {
  text: string;
  commands: string[];
}

export default function App() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  
  const termRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch sandboxes
  const fetchSandboxes = useCallback(async () => {
    const res = await fetch(`${API}/sandboxes`);
    setSandboxes(await res.json());
  }, []);

  useEffect(() => { fetchSandboxes(); }, [fetchSandboxes]);

  // Create sandbox
  const createSandbox = async () => {
    if (!newName.trim()) return;
    await fetch(`${API}/sandboxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    setNewName('');
    setShowCreate(false);
    fetchSandboxes();
  };

  // Connect to sandbox
  const connect = async (sandboxId: string) => {
    const res = await fetch(`${API}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId }),
    });
    const session = await res.json();
    setActiveSession(session.id);

    // Init terminal
    if (termRef.current && !termInstance.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#58a6ff',
          selectionBackground: '#264f78',
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new WebLinksAddon());
      term.open(termRef.current);
      fit.fit();
      termInstance.current = term;

      // Resize observer
      const ro = new ResizeObserver(() => fit.fit());
      ro.observe(termRef.current);
    }

    // Connect WebSocket
    const ws = new WebSocket(`ws://${location.host}/ws/terminal/${session.id}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'output') termInstance.current?.write(msg.data);
      if (msg.type === 'suggestion') setSuggestion(msg.suggestion);
    };

    ws.onopen = () => {
      const { cols, rows } = termInstance.current!;
      ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    };

    termInstance.current?.onData((data) => {
      ws.send(JSON.stringify({ type: 'input', data }));
    });
  };

  const executeCommand = (cmd: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'input', data: cmd + '\n' }));
    setSuggestion(null);
  };

  return (
    <div className="h-screen flex flex-col bg-terminal-bg">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-terminal-border px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xl">🖥️</span>
          <h1 className="font-semibold text-terminal-accent">sandterm</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1 text-sm bg-terminal-accent/20 text-terminal-accent rounded hover:bg-terminal-accent/30"
        >
          + New Sandbox
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-terminal-border p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-terminal-fg/60 mb-3">Sandboxes</h2>
          {sandboxes.length === 0 ? (
            <p className="text-sm text-terminal-fg/40">No sandboxes yet</p>
          ) : (
            <div className="space-y-2">
              {sandboxes.map((sb) => (
                <button
                  key={sb.id}
                  onClick={() => sb.status === 'running' && connect(sb.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    activeSession?.startsWith(sb.id) 
                      ? 'bg-terminal-accent/20 text-terminal-accent' 
                      : 'hover:bg-terminal-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sb.status === 'running' ? 'bg-green-500' : 'bg-gray-500'}`} />
                    {sb.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Terminal */}
        <main className="flex-1 relative">
          {activeSession ? (
            <>
              <div ref={termRef} className="terminal-container" />
              
              {/* AI Suggestion */}
              {suggestion && (
                <div className="absolute bottom-4 left-4 right-4 animate-slide-up">
                  <div className="rounded-lg bg-terminal-accent/10 border border-terminal-accent/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-terminal-accent">🤖 AI Suggestion</span>
                      <button onClick={() => setSuggestion(null)} className="text-terminal-fg/40 hover:text-terminal-fg">✕</button>
                    </div>
                    <p className="text-sm text-terminal-fg/80 mb-3">{suggestion.text}</p>
                    <div className="flex gap-2 flex-wrap">
                      {suggestion.commands.map((cmd, i) => (
                        <button
                          key={i}
                          onClick={() => executeCommand(cmd)}
                          className="px-3 py-1 text-sm bg-terminal-accent/20 text-terminal-accent rounded hover:bg-terminal-accent/30"
                        >
                          ▶ {cmd}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-4">🖥️</div>
                <h2 className="text-xl font-semibold mb-2">sandterm</h2>
                <p className="text-terminal-fg/50">Select a sandbox to connect</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-6 w-80">
            <h2 className="font-semibold mb-4">Create Sandbox</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Sandbox name"
              className="w-full px-3 py-2 bg-terminal-border/30 border border-terminal-border rounded mb-4 outline-none focus:border-terminal-accent"
              onKeyDown={(e) => e.key === 'Enter' && createSandbox()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-terminal-fg/60 hover:text-terminal-fg">
                Cancel
              </button>
              <button onClick={createSandbox} className="px-4 py-2 text-sm bg-terminal-accent text-white rounded">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
