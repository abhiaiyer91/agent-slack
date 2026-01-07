import { useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Workspace } from '../types';
import clsx from 'clsx';

interface WorkspaceListProps {
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
}

export function WorkspaceList({ onSelectWorkspace, onCreateWorkspace }: WorkspaceListProps) {
  const {
    workspaces,
    selectedWorkspace,
    loading,
    error,
    fetchWorkspaces,
    startWorkspace,
    stopWorkspace,
    deleteWorkspace,
    selectWorkspace,
  } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleSelect = (workspace: Workspace) => {
    selectWorkspace(workspace);
    onSelectWorkspace(workspace);
  };

  const handleStart = async (e: React.MouseEvent, workspace: Workspace) => {
    e.stopPropagation();
    await startWorkspace(workspace.id);
  };

  const handleStop = async (e: React.MouseEvent, workspace: Workspace) => {
    e.stopPropagation();
    await stopWorkspace(workspace.id);
  };

  const handleDelete = async (e: React.MouseEvent, workspace: Workspace) => {
    e.stopPropagation();
    if (confirm(`Delete workspace "${workspace.name}"?`)) {
      await deleteWorkspace(workspace.id);
    }
  };

  const getStatusColor = (status: Workspace['status']) => {
    switch (status) {
      case 'running':
        return 'bg-terminal-green';
      case 'starting':
      case 'creating':
        return 'bg-terminal-yellow animate-pulse';
      case 'stopped':
        return 'bg-terminal-fg/30';
      case 'stopping':
        return 'bg-terminal-yellow';
      case 'error':
        return 'bg-terminal-red';
      default:
        return 'bg-terminal-fg/30';
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-terminal-selection/30 px-4 py-3">
        <h2 className="font-semibold text-terminal-fg">Workspaces</h2>
        <button
          onClick={onCreateWorkspace}
          className="rounded bg-daytona-primary px-3 py-1 text-sm text-white hover:bg-daytona-primary/80"
        >
          + New
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded bg-terminal-red/20 px-3 py-2 text-sm text-terminal-red">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {loading && workspaces.length === 0 ? (
          <div className="text-center text-terminal-fg/50">Loading...</div>
        ) : workspaces.length === 0 ? (
          <div className="text-center text-terminal-fg/50">
            <p className="mb-2">No workspaces yet</p>
            <button
              onClick={onCreateWorkspace}
              className="text-daytona-primary hover:underline"
            >
              Create your first workspace
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => handleSelect(workspace)}
                className={clsx(
                  'cursor-pointer rounded border p-3 transition-colors',
                  selectedWorkspace?.id === workspace.id
                    ? 'border-daytona-primary bg-daytona-primary/10'
                    : 'border-terminal-selection/30 hover:border-terminal-selection'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={clsx('h-2 w-2 rounded-full', getStatusColor(workspace.status))} />
                    <span className="font-medium text-terminal-fg">{workspace.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {workspace.status === 'running' ? (
                      <button
                        onClick={(e) => handleStop(e, workspace)}
                        className="rounded p-1 text-terminal-fg/50 hover:bg-terminal-selection/50 hover:text-terminal-fg"
                        title="Stop"
                      >
                        ⏹
                      </button>
                    ) : workspace.status === 'stopped' ? (
                      <button
                        onClick={(e) => handleStart(e, workspace)}
                        className="rounded p-1 text-terminal-fg/50 hover:bg-terminal-selection/50 hover:text-terminal-fg"
                        title="Start"
                      >
                        ▶
                      </button>
                    ) : null}
                    <button
                      onClick={(e) => handleDelete(e, workspace)}
                      className="rounded p-1 text-terminal-fg/50 hover:bg-terminal-red/20 hover:text-terminal-red"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-terminal-fg/50">
                  {workspace.repository_url ? (
                    <span>{workspace.repository_url}</span>
                  ) : (
                    <span>No repository</span>
                  )}
                </div>
                {workspace.ai_assistant && (
                  <div className="mt-1">
                    <span className="rounded bg-daytona-secondary/20 px-2 py-0.5 text-xs text-daytona-secondary">
                      🤖 {workspace.ai_assistant}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
