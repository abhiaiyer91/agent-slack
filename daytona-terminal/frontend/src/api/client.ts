/**
 * API client for Daytona Terminal backend
 */

const API_BASE = '/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || error.message || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Workspace API
export const workspacesApi = {
  list: (page = 1, perPage = 20) =>
    fetchApi<{ workspaces: import('../types').Workspace[]; total: number }>(
      `/workspaces?page=${page}&perPage=${perPage}`
    ),

  get: (id: string) =>
    fetchApi<import('../types').Workspace>(`/workspaces/${id}`),

  create: (data: import('../types').WorkspaceCreate) =>
    fetchApi<import('../types').Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/workspaces/${id}`, { method: 'DELETE' }),

  start: (id: string) =>
    fetchApi<import('../types').Workspace>(`/workspaces/${id}/start`, {
      method: 'POST',
    }),

  stop: (id: string) =>
    fetchApi<import('../types').Workspace>(`/workspaces/${id}/stop`, {
      method: 'POST',
    }),

  execute: (id: string, command: string, workingDir?: string) =>
    fetchApi<{ output: string; exitCode: number }>(`/workspaces/${id}/exec`, {
      method: 'POST',
      body: JSON.stringify({ command, workingDir }),
    }),
};

// Session API
export const sessionsApi = {
  list: (workspaceId?: string) =>
    fetchApi<import('../types').TerminalSession[]>(
      `/sessions${workspaceId ? `?workspaceId=${workspaceId}` : ''}`
    ),

  get: (id: string) =>
    fetchApi<import('../types').TerminalSession>(`/sessions/${id}`),

  create: (data: import('../types').TerminalSessionCreate) =>
    fetchApi<import('../types').TerminalSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  close: (id: string) =>
    fetchApi<void>(`/sessions/${id}`, { method: 'DELETE' }),

  resize: (id: string, cols: number, rows: number) =>
    fetchApi<import('../types').TerminalSession>(`/sessions/${id}/resize`, {
      method: 'POST',
      body: JSON.stringify({ cols, rows }),
    }),

  getContext: (id: string, maxBytes = 10000) =>
    fetchApi<{ context: string }>(`/sessions/${id}/context?maxBytes=${maxBytes}`),

  getBlocks: (id: string, limit = 20) =>
    fetchApi<{ blocks: import('../types').CommandBlock[] }>(`/sessions/${id}/blocks?limit=${limit}`),
};

// AI API
export const aiApi = {
  listAssistants: () =>
    fetchApi<import('../types').AIAssistant[]>('/ai/assistants'),

  getAssistant: (type: string) =>
    fetchApi<import('../types').AIAssistant>(`/ai/assistants/${type}`),

  createConversation: (
    sessionId: string,
    assistantType: import('../types').AIAssistantType = 'claude',
    systemPrompt?: string
  ) =>
    fetchApi<import('../types').AIConversation>('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({ sessionId, assistantType, systemPrompt }),
    }),

  getConversation: (id: string) =>
    fetchApi<import('../types').AIConversation>(`/ai/conversations/${id}`),

  sendMessage: (id: string, request: import('../types').AICommandRequest) =>
    fetchApi<import('../types').AICommandResponse>(
      `/ai/conversations/${id}/message`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    ),

  deleteConversation: (id: string) =>
    fetchApi<void>(`/ai/conversations/${id}`, { method: 'DELETE' }),

  clearConversation: (id: string) =>
    fetchApi<void>(`/ai/conversations/${id}/clear`, { method: 'POST' }),

  analyze: (sessionId: string, output: string) =>
    fetchApi<{ suggestion: string | null; commands: string[] }>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ sessionId, output }),
    }),

  getCompletions: (sessionId: string, partial: string) =>
    fetchApi<{ completions: string[] }>('/ai/completions', {
      method: 'POST',
      body: JSON.stringify({ sessionId, partial }),
    }),
};

export { ApiError };
