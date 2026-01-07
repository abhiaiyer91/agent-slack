import { useState, useCallback, useRef } from 'react';
import { Terminal } from './components/Terminal';
import { AIPanel } from './components/AIPanel';
import { WorkspaceList } from './components/WorkspaceList';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { useSessionStore } from './stores/sessionStore';
import type { Workspace } from './types';

function App() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const terminalWriteRef = useRef<((data: string) => void) | null>(null);

  const { activeSession, createSession } = useSessionStore();

  const handleSelectWorkspace = useCallback(
    async (workspace: Workspace) => {
      if (workspace.status !== 'running') {
        // Could auto-start here
        alert('Start the workspace first to open terminal');
        return;
      }

      try {
        await createSession({
          workspaceId: workspace.id,
          cols: 120,
          rows: 40,
        });
      } catch (err) {
        console.error('Failed to create session:', err);
      }
    },
    [createSession]
  );

  const handleExecuteCommand = useCallback((command: string) => {
    // Write command to terminal
    if (terminalWriteRef.current) {
      terminalWriteRef.current(command + '\n');
    }
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-[#1a1b26] text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2 bg-[#16161e]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-lg font-bold">⌘</span>
            </div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Daytona Terminal
            </h1>
          </div>
          
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
            AI-Powered
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSidebar((prev) => !prev)}
            className={`p-2 rounded-lg transition-colors ${
              showSidebar
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setShowAIPanel((prev) => !prev)}
            className={`p-2 rounded-lg transition-colors ${
              showAIPanel
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Toggle AI panel"
          >
            <span className="text-lg">🤖</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Workspace list */}
        {showSidebar && (
          <aside className="w-72 flex-shrink-0 border-r border-white/10 bg-[#16161e]">
            <WorkspaceList
              onSelectWorkspace={handleSelectWorkspace}
              onCreateWorkspace={() => setShowCreateModal(true)}
            />
          </aside>
        )}

        {/* Terminal area */}
        <main className="flex flex-1 overflow-hidden">
          {activeSession ? (
            <div className="flex flex-1 overflow-hidden">
              {/* Terminal */}
              <div className={showAIPanel ? 'w-2/3' : 'w-full'}>
                <Terminal
                  sessionId={activeSession.id}
                  onConnected={() => console.log('Terminal connected')}
                  onDisconnected={() => console.log('Terminal disconnected')}
                />
              </div>

              {/* AI Panel */}
              {showAIPanel && (
                <div className="w-1/3 border-l border-white/10">
                  <AIPanel
                    sessionId={activeSession.id}
                    onExecuteCommand={handleExecuteCommand}
                    className="h-full"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center max-w-md px-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">⌘</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Welcome to Daytona Terminal
                </h2>
                <p className="text-white/50 mb-6">
                  The AI-powered terminal that understands your code. Create a workspace to get started.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-400 hover:to-purple-400 transition-all shadow-lg shadow-indigo-500/25"
                >
                  Create Workspace
                </button>

                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl mb-1">🧠</div>
                    <div className="text-xs text-white/40">AI Error Detection</div>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">⚡</div>
                    <div className="text-xs text-white/40">Predictive Commands</div>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">🔧</div>
                    <div className="text-xs text-white/40">Auto-Fix Suggestions</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 py-1.5 text-xs text-white/40 bg-[#16161e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {activeSession ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {activeSession.id.slice(0, 8)}
                </span>
                <span>{activeSession.cols}×{activeSession.rows}</span>
              </>
            ) : (
              <span>No active session</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>Ctrl+F Search</span>
            <span>Ctrl+B Blocks</span>
            <span className="text-indigo-400">Powered by Daytona.io</span>
          </div>
        </div>
      </footer>

      {/* Create workspace modal */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {}}
      />
    </div>
  );
}

export default App;
