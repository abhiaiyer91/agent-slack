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

interface CommandBlock {
  id: string;
  command: string;
  output: string;
  status: 'running' | 'success' | 'error';
  startTime: Date;
}

interface Prediction {
  command: string;
  explanation: string;
  confidence: number;
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

type Theme = 'dark' | 'dracula' | 'monokai' | 'nord';

const THEMES: Record<Theme, { bg: string; fg: string; cursor: string; selection: string }> = {
  dark: { bg: '#0d1117', fg: '#c9d1d9', cursor: '#58a6ff', selection: '#264f78' },
  dracula: { bg: '#282a36', fg: '#f8f8f2', cursor: '#ff79c6', selection: '#44475a' },
  monokai: { bg: '#272822', fg: '#f8f8f2', cursor: '#f92672', selection: '#49483e' },
  nord: { bg: '#2e3440', fg: '#eceff4', cursor: '#88c0d0', selection: '#434c5e' },
};

export default function App() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [activeSandboxId, setActiveSandboxId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [blocks, setBlocks] = useState<CommandBlock[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [splitMode, setSplitMode] = useState<'single' | 'horizontal' | 'vertical'>('single');
  
  const termRef = useRef<HTMLDivElement>(null);
  const termRef2 = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    setActiveSandboxId(sandboxId);

    // Init terminal
    if (termRef.current && !termInstance.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        theme: THEMES[theme],
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new WebLinksAddon());
      term.open(termRef.current);
      fit.fit();
      termInstance.current = term;

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
      if (msg.type === 'block') {
        setBlocks(prev => {
          const existing = prev.findIndex(b => b.id === msg.block.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = msg.block;
            return updated;
          }
          return [...prev, msg.block];
        });
      }
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
    setPredictions([]);
  };

  // AI Chat
  const sendAIMessage = async () => {
    if (!aiInput.trim() || !activeSession) return;
    
    setAiMessages(prev => [...prev, { role: 'user', content: aiInput }]);
    const prompt = aiInput;
    setAiInput('');

    const res = await fetch(`${API}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: activeSession, prompt }),
    });
    const data = await res.json();
    setAiMessages(prev => [...prev, { role: 'ai', content: data.message }]);
    
    if (data.commands?.length) {
      setPredictions(data.commands.map((cmd: string) => ({
        command: cmd,
        explanation: 'AI suggested',
        confidence: 0.9,
      })));
    }
  };

  // Voice Commands
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice commands not supported in this browser');
      return;
    }

    if (isVoiceActive) {
      recognitionRef.current?.stop();
      setIsVoiceActive(false);
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.trim();
        // Process voice command
        processVoiceCommand(transcript);
      }
    };

    recognition.onerror = () => setIsVoiceActive(false);
    recognition.onend = () => setIsVoiceActive(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsVoiceActive(true);
  };

  const processVoiceCommand = async (transcript: string) => {
    // Simple voice command processing
    const lower = transcript.toLowerCase();
    
    if (lower.includes('clear')) {
      executeCommand('clear');
    } else if (lower.includes('status')) {
      executeCommand('git status');
    } else if (lower.includes('list files')) {
      executeCommand('ls -la');
    } else if (lower.startsWith('run ')) {
      executeCommand(transcript.slice(4));
    } else {
      // Send to AI for interpretation
      setAiInput(transcript);
      setShowAI(true);
    }
  };

  const currentTheme = THEMES[theme];

  return (
    <div className="h-screen flex flex-col" style={{ background: currentTheme.bg, color: currentTheme.fg }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: currentTheme.selection }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🖥️</span>
          <h1 className="font-semibold" style={{ color: currentTheme.cursor }}>sandterm</h1>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: currentTheme.selection }}>
            Warp Killer Edition
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
            className="text-sm px-2 py-1 rounded border-0"
            style={{ background: currentTheme.selection, color: currentTheme.fg }}
          >
            <option value="dark">Dark</option>
            <option value="dracula">Dracula</option>
            <option value="monokai">Monokai</option>
            <option value="nord">Nord</option>
          </select>
          
          {/* Split Mode */}
          <div className="flex rounded overflow-hidden" style={{ background: currentTheme.selection }}>
            <button
              onClick={() => setSplitMode('single')}
              className={`px-2 py-1 text-sm ${splitMode === 'single' ? 'opacity-100' : 'opacity-50'}`}
            >
              ▣
            </button>
            <button
              onClick={() => setSplitMode('horizontal')}
              className={`px-2 py-1 text-sm ${splitMode === 'horizontal' ? 'opacity-100' : 'opacity-50'}`}
            >
              ⬒
            </button>
            <button
              onClick={() => setSplitMode('vertical')}
              className={`px-2 py-1 text-sm ${splitMode === 'vertical' ? 'opacity-100' : 'opacity-50'}`}
            >
              ⬓
            </button>
          </div>
          
          {/* Voice */}
          <button
            onClick={toggleVoice}
            className={`px-3 py-1 text-sm rounded ${isVoiceActive ? 'animate-pulse' : ''}`}
            style={{ 
              background: isVoiceActive ? '#ef4444' : currentTheme.selection,
              color: isVoiceActive ? 'white' : currentTheme.fg
            }}
          >
            🎤 {isVoiceActive ? 'Listening...' : 'Voice'}
          </button>
          
          {/* AI Panel Toggle */}
          <button
            onClick={() => setShowAI(!showAI)}
            className="px-3 py-1 text-sm rounded"
            style={{ background: showAI ? currentTheme.cursor : currentTheme.selection }}
          >
            🤖 AI
          </button>
          
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1 text-sm rounded"
            style={{ background: `${currentTheme.cursor}33`, color: currentTheme.cursor }}
          >
            + New Sandbox
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r p-4 overflow-y-auto" style={{ borderColor: currentTheme.selection }}>
          <h2 className="text-sm font-semibold opacity-60 mb-3">Sandboxes</h2>
          {sandboxes.length === 0 ? (
            <p className="text-sm opacity-40">No sandboxes yet</p>
          ) : (
            <div className="space-y-2">
              {sandboxes.map((sb) => (
                <button
                  key={sb.id}
                  onClick={() => sb.status === 'running' && connect(sb.id)}
                  className="w-full text-left px-3 py-2 rounded text-sm transition-colors"
                  style={{
                    background: activeSandboxId === sb.id ? `${currentTheme.cursor}33` : 'transparent',
                    color: activeSandboxId === sb.id ? currentTheme.cursor : currentTheme.fg,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ background: sb.status === 'running' ? '#22c55e' : '#6b7280' }}
                    />
                    {sb.name}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Command Blocks */}
          {blocks.length > 0 && (
            <>
              <h2 className="text-sm font-semibold opacity-60 mt-6 mb-3">Command History</h2>
              <div className="space-y-2">
                {blocks.slice(-10).reverse().map((block) => (
                  <div
                    key={block.id}
                    className="px-3 py-2 rounded text-xs cursor-pointer hover:opacity-80"
                    style={{ background: currentTheme.selection }}
                    onClick={() => executeCommand(block.command)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{block.status === 'error' ? '❌' : block.status === 'running' ? '⏳' : '✅'}</span>
                      <span className="font-mono truncate">{block.command}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative">
          {activeSession ? (
            <>
              {/* Terminal Area */}
              <div className={`flex-1 flex ${splitMode === 'vertical' ? 'flex-col' : 'flex-row'}`}>
                <div 
                  ref={termRef} 
                  className="terminal-container flex-1"
                  style={{ minHeight: splitMode !== 'single' ? '50%' : '100%' }}
                />
                {splitMode !== 'single' && (
                  <div 
                    ref={termRef2}
                    className="terminal-container flex-1"
                    style={{ 
                      borderLeft: splitMode === 'horizontal' ? `1px solid ${currentTheme.selection}` : 'none',
                      borderTop: splitMode === 'vertical' ? `1px solid ${currentTheme.selection}` : 'none',
                    }}
                  />
                )}
              </div>
              
              {/* Predictions */}
              {predictions.length > 0 && (
                <div 
                  className="absolute top-2 right-2 rounded-lg p-3 max-w-md animate-slide-up"
                  style={{ background: currentTheme.selection }}
                >
                  <div className="text-xs opacity-60 mb-2">Suggestions</div>
                  {predictions.map((pred, i) => (
                    <button
                      key={i}
                      onClick={() => executeCommand(pred.command)}
                      className="block w-full text-left px-3 py-2 rounded text-sm hover:opacity-80 mb-1"
                      style={{ background: `${currentTheme.cursor}22` }}
                    >
                      <span className="font-mono" style={{ color: currentTheme.cursor }}>{pred.command}</span>
                      <span className="text-xs opacity-60 ml-2">{pred.explanation}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {/* AI Suggestion */}
              {suggestion && (
                <div 
                  className="absolute bottom-4 left-4 right-4 animate-slide-up rounded-lg p-4"
                  style={{ background: `${currentTheme.cursor}22`, border: `1px solid ${currentTheme.cursor}44` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: currentTheme.cursor }}>🤖 AI Suggestion</span>
                    <button onClick={() => setSuggestion(null)} className="opacity-40 hover:opacity-100">✕</button>
                  </div>
                  <p className="text-sm opacity-80 mb-3">{suggestion.text}</p>
                  <div className="flex gap-2 flex-wrap">
                    {suggestion.commands.map((cmd, i) => (
                      <button
                        key={i}
                        onClick={() => executeCommand(cmd)}
                        className="px-3 py-1 text-sm rounded"
                        style={{ background: `${currentTheme.cursor}33`, color: currentTheme.cursor }}
                      >
                        ▶ {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🖥️</div>
                <h2 className="text-2xl font-semibold mb-2">sandterm</h2>
                <p className="opacity-50 mb-6">The AI-powered terminal that destroys Warp</p>
                <div className="flex gap-4 justify-center text-sm opacity-60">
                  <div>🤖 AI Agents</div>
                  <div>🎤 Voice Commands</div>
                  <div>⚡ Predictive</div>
                  <div>☁️ Any Cloud</div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* AI Panel */}
        {showAI && (
          <aside className="w-80 border-l p-4 flex flex-col" style={{ borderColor: currentTheme.selection }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: currentTheme.cursor }}>🤖 AI Assistant</h2>
              <button onClick={() => setShowAI(false)} className="opacity-40 hover:opacity-100">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {aiMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-sm ${msg.role === 'user' ? 'ml-4' : 'mr-4'}`}
                  style={{
                    background: msg.role === 'user' ? currentTheme.selection : `${currentTheme.cursor}22`,
                  }}
                >
                  {msg.content}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendAIMessage()}
                placeholder="Ask AI..."
                className="flex-1 px-3 py-2 rounded border-0 text-sm"
                style={{ background: currentTheme.selection, color: currentTheme.fg }}
              />
              <button
                onClick={sendAIMessage}
                className="px-4 py-2 rounded text-sm"
                style={{ background: currentTheme.cursor, color: '#000' }}
              >
                Send
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div 
            className="rounded-lg p-6 w-80"
            style={{ background: currentTheme.bg, border: `1px solid ${currentTheme.selection}` }}
          >
            <h2 className="font-semibold mb-4">Create Sandbox</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Sandbox name"
              className="w-full px-3 py-2 rounded mb-4 border-0"
              style={{ background: currentTheme.selection, color: currentTheme.fg }}
              onKeyDown={(e) => e.key === 'Enter' && createSandbox()}
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowCreate(false)} 
                className="px-4 py-2 text-sm opacity-60 hover:opacity-100"
              >
                Cancel
              </button>
              <button 
                onClick={createSandbox} 
                className="px-4 py-2 text-sm rounded"
                style={{ background: currentTheme.cursor, color: '#000' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

