import { useState, useCallback } from 'react';
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

  const { activeSession, createSession } = useSessionStore();

  const handleSelectWorkspace = useCallback(
    async (workspace: Workspace) => {
      if (workspace.status !== 'running') {
        alert('Workspace must be running to open terminal');
        return;
      }

      try {
        await createSession({
          workspace_id: workspace.id,
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
    // This would send the command to the active terminal
    // For now, we'll just log it
    console.log('Execute command:', command);
    // In a real implementation, you'd use the terminal's write function
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-terminal-bg text-terminal-fg">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-terminal-selection/30 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⌘</span>
          <h1 className="text-lg font-semibold">Daytona Terminal</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSidebar((prev) => !prev)}
            className={`rounded p-2 ${
              showSidebar
                ? 'bg-terminal-selection/50 text-terminal-fg'
                : 'text-terminal-fg/50 hover:text-terminal-fg'
            }`}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <button
            onClick={() => setShowAIPanel((prev) => !prev)}
            className={`rounded p-2 ${
              showAIPanel
                ? 'bg-daytona-primary/20 text-daytona-primary'
                : 'text-terminal-fg/50 hover:text-terminal-fg'
            }`}
            title="Toggle AI panel"
          >
            🤖
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Workspace list */}
        {showSidebar && (
          <aside className="w-72 flex-shrink-0 border-r border-terminal-selection/30 bg-terminal-black">
            <WorkspaceList
              onSelectWorkspace={handleSelectWorkspace}
              onCreateWorkspace={() => setShowCreateModal(true)}
            />
          </aside>
        )}

        {/* Terminal area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {activeSession ? (
            <div className="flex flex-1 overflow-hidden">
              {/* Terminal */}
              <div className={`flex-1 ${showAIPanel ? 'w-2/3' : 'w-full'}`}>
                <Terminal
                  sessionId={activeSession.id}
                  onConnected={() => console.log('Terminal connected')}
                  onDisconnected={() => console.log('Terminal disconnected')}
                />
              </div>

              {/* AI Panel */}
              {showAIPanel && (
                <div className="w-1/3 border-l border-terminal-selection/30">
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
              <div className="text-center">
                <div className="mb-4 text-6xl">⌘</div>
                <h2 className="mb-2 text-xl font-semibold text-terminal-fg">
                  Welcome to Daytona Terminal
                </h2>
                <p className="mb-4 text-terminal-fg/50">
                  Create or select a workspace to get started
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="rounded bg-daytona-primary px-6 py-2 font-medium text-white hover:bg-daytona-primary/80"
                >
                  Create Workspace
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-terminal-selection/30 px-4 py-1 text-xs text-terminal-fg/50">
        <div className="flex items-center justify-between">
          <span>
            {activeSession ? (
              <>
                Session: {activeSession.id.slice(0, 8)}... | {activeSession.cols}x
                {activeSession.rows}
              </>
            ) : (
              'No active session'
            )}
          </span>
          <span>Powered by Daytona.io</span>
        </div>
      </footer>

      {/* Create workspace modal */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          // Refresh workspace list or handle created workspace
        }}
      />
    </div>
  );
}

export default App;
