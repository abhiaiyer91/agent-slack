import { useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { WorkspaceCreate } from '../types';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreated,
}: CreateWorkspaceModalProps) {
  const [formData, setFormData] = useState<WorkspaceCreate>({
    name: '',
    repository_url: '',
    branch: '',
    ai_assistant: 'claude',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createWorkspace } = useWorkspaceStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createWorkspace({
        ...formData,
        repository_url: formData.repository_url || undefined,
        branch: formData.branch || undefined,
      });
      onCreated();
      onClose();
      // Reset form
      setFormData({
        name: '',
        repository_url: '',
        branch: '',
        ai_assistant: 'claude',
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-terminal-black p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-terminal-fg">Create Workspace</h2>
          <button
            onClick={onClose}
            className="text-terminal-fg/50 hover:text-terminal-fg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-terminal-red/20 px-3 py-2 text-sm text-terminal-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-terminal-fg/70">
              Workspace Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="my-project"
              className="w-full rounded bg-terminal-bg px-3 py-2 text-terminal-fg outline-none ring-1 ring-terminal-selection/30 focus:ring-daytona-primary"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-terminal-fg/70">
              Repository URL (optional)
            </label>
            <input
              type="url"
              value={formData.repository_url}
              onChange={(e) =>
                setFormData({ ...formData, repository_url: e.target.value })
              }
              placeholder="https://github.com/user/repo"
              className="w-full rounded bg-terminal-bg px-3 py-2 text-terminal-fg outline-none ring-1 ring-terminal-selection/30 focus:ring-daytona-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-terminal-fg/70">
              Branch (optional)
            </label>
            <input
              type="text"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              placeholder="main"
              className="w-full rounded bg-terminal-bg px-3 py-2 text-terminal-fg outline-none ring-1 ring-terminal-selection/30 focus:ring-daytona-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-terminal-fg/70">
              AI Assistant
            </label>
            <select
              value={formData.ai_assistant || ''}
              onChange={(e) =>
                setFormData({ ...formData, ai_assistant: e.target.value || undefined })
              }
              className="w-full rounded bg-terminal-bg px-3 py-2 text-terminal-fg outline-none ring-1 ring-terminal-selection/30 focus:ring-daytona-primary"
            >
              <option value="">None</option>
              <option value="claude">Claude Code</option>
              <option value="openai">OpenAI Codex</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-terminal-fg/70 hover:text-terminal-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name}
              className="rounded bg-daytona-primary px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
