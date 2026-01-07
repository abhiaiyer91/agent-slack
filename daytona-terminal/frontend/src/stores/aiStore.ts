import { create } from 'zustand';
import { aiApi } from '../api/client';
import type {
  AIAssistant,
  AIConversation,
  AICommandRequest,
  AICommandResponse,
  AIAssistantType,
} from '../types';

interface AIState {
  assistants: AIAssistant[];
  currentConversation: AIConversation | null;
  responses: AICommandResponse[];
  loading: boolean;
  error: string | null;

  fetchAssistants: () => Promise<void>;
  createConversation: (
    sessionId: string,
    assistantType?: AIAssistantType
  ) => Promise<AIConversation>;
  sendMessage: (request: AICommandRequest) => Promise<AICommandResponse>;
  clearConversation: () => Promise<void>;
  setConversation: (conversation: AIConversation | null) => void;
  clearResponses: () => void;
  clearError: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  assistants: [],
  currentConversation: null,
  responses: [],
  loading: false,
  error: null,

  fetchAssistants: async () => {
    set({ loading: true, error: null });
    try {
      const assistants = await aiApi.listAssistants();
      set({ assistants, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createConversation: async (
    sessionId: string,
    assistantType: AIAssistantType = 'claude'
  ) => {
    set({ loading: true, error: null });
    try {
      const conversation = await aiApi.createConversation(sessionId, assistantType);
      set({ currentConversation: conversation, responses: [], loading: false });
      return conversation;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  sendMessage: async (request: AICommandRequest) => {
    const { currentConversation } = get();
    if (!currentConversation) {
      throw new Error('No active conversation');
    }

    set({ loading: true, error: null });
    try {
      const response = await aiApi.sendMessage(currentConversation.id, request);
      set((state) => ({
        responses: [...state.responses, response],
        loading: false,
      }));
      return response;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  clearConversation: async () => {
    const { currentConversation } = get();
    if (currentConversation) {
      try {
        await aiApi.clearConversation(currentConversation.id);
        set((state) => ({
          currentConversation: state.currentConversation
            ? { ...state.currentConversation, messages: [] }
            : null,
          responses: [],
        }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    }
  },

  setConversation: (conversation: AIConversation | null) => {
    set({ currentConversation: conversation, responses: [] });
  },

  clearResponses: () => {
    set({ responses: [] });
  },

  clearError: () => {
    set({ error: null });
  },
}));
