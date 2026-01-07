import { create } from 'zustand';
import { workspacesApi } from '../api/client';
import type { Workspace, WorkspaceCreate } from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspace: (id: string) => Promise<Workspace | null>;
  createWorkspace: (data: WorkspaceCreate) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  startWorkspace: (id: string) => Promise<void>;
  stopWorkspace: (id: string) => Promise<void>;
  selectWorkspace: (workspace: Workspace | null) => void;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  selectedWorkspace: null,
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const response = await workspacesApi.list();
      set({ workspaces: response.workspaces, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchWorkspace: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const workspace = await workspacesApi.get(id);
      set({ loading: false });
      return workspace;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      return null;
    }
  },

  createWorkspace: async (data: WorkspaceCreate) => {
    set({ loading: true, error: null });
    try {
      const workspace = await workspacesApi.create(data);
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
        selectedWorkspace: workspace,
        loading: false,
      }));
      return workspace;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  deleteWorkspace: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await workspacesApi.delete(id);
      set((state) => ({
        workspaces: state.workspaces.filter((w) => w.id !== id),
        selectedWorkspace:
          state.selectedWorkspace?.id === id ? null : state.selectedWorkspace,
        loading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  startWorkspace: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const workspace = await workspacesApi.start(id);
      set((state) => ({
        workspaces: state.workspaces.map((w) =>
          w.id === id ? workspace : w
        ),
        selectedWorkspace:
          state.selectedWorkspace?.id === id
            ? workspace
            : state.selectedWorkspace,
        loading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  stopWorkspace: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const workspace = await workspacesApi.stop(id);
      set((state) => ({
        workspaces: state.workspaces.map((w) =>
          w.id === id ? workspace : w
        ),
        selectedWorkspace:
          state.selectedWorkspace?.id === id
            ? workspace
            : state.selectedWorkspace,
        loading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  selectWorkspace: (workspace: Workspace | null) => {
    set({ selectedWorkspace: workspace });
  },

  clearError: () => {
    set({ error: null });
  },
}));
