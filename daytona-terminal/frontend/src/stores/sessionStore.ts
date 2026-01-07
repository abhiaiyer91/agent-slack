import { create } from 'zustand';
import { sessionsApi } from '../api/client';
import type { TerminalSession, TerminalSessionCreate } from '../types';

interface SessionState {
  sessions: TerminalSession[];
  activeSession: TerminalSession | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchSessions: (workspaceId?: string) => Promise<void>;
  createSession: (data: TerminalSessionCreate) => Promise<TerminalSession>;
  closeSession: (id: string) => Promise<void>;
  resizeSession: (id: string, cols: number, rows: number) => Promise<void>;
  setActiveSession: (session: TerminalSession | null) => void;
  updateSessionStatus: (id: string, status: TerminalSession['status']) => void;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSession: null,
  loading: false,
  error: null,

  fetchSessions: async (workspaceId?: string) => {
    set({ loading: true, error: null });
    try {
      const sessions = await sessionsApi.list(workspaceId);
      set({ sessions, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createSession: async (data: TerminalSessionCreate) => {
    set({ loading: true, error: null });
    try {
      const session = await sessionsApi.create(data);
      set((state) => ({
        sessions: [...state.sessions, session],
        activeSession: session,
        loading: false,
      }));
      return session;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  closeSession: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await sessionsApi.close(id);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        activeSession:
          state.activeSession?.id === id ? null : state.activeSession,
        loading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  resizeSession: async (id: string, cols: number, rows: number) => {
    try {
      const session = await sessionsApi.resize(id, cols, rows);
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? session : s)),
        activeSession:
          state.activeSession?.id === id ? session : state.activeSession,
      }));
    } catch (err) {
      console.error('Failed to resize session:', err);
    }
  },

  setActiveSession: (session: TerminalSession | null) => {
    set({ activeSession: session });
  },

  updateSessionStatus: (id: string, status: TerminalSession['status']) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
      activeSession:
        state.activeSession?.id === id
          ? { ...state.activeSession, status }
          : state.activeSession,
    }));
  },

  clearError: () => {
    set({ error: null });
  },
}));
