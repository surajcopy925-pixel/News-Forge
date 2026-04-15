const API_BASE = '/api';

// ═══════════════════════════════════════
// GENERIC FETCH WRAPPER
// ═══════════════════════════════════════

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

// ═══════════════════════════════════════
// STORIES
// ═══════════════════════════════════════

export const storiesApi = {
  list: (filters?: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : '';
    return apiFetch<any[]>(`/stories${query}`);
  },

  get: (storyId: string) =>
    apiFetch<any>(`/stories/${storyId}`),

  create: (data: any) =>
    apiFetch<any>('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (storyId: string, data: any) =>
    apiFetch<any>(`/stories/${storyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (storyId: string) =>
    apiFetch<any>(`/stories/${storyId}`, {
      method: 'DELETE',
    }),

  getClips: (storyId: string) =>
    apiFetch<any[]>(`/stories/${storyId}/clips`),

  sendToRundown: (storyId: string, data: { rundownId: string; userId?: string }) =>
    apiFetch<any>(`/stories/${storyId}/send-to-rundown`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ═══════════════════════════════════════
// CLIPS
// ═══════════════════════════════════════

export const clipsApi = {
  list: (filters?: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : '';
    return apiFetch<any[]>(`/clips${query}`);
  },

  get: (clipId: string) =>
    apiFetch<any>(`/clips/${clipId}`),

  create: (data: any) =>
    apiFetch<any>('/clips', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (clipId: string, data: any) =>
    apiFetch<any>(`/clips/${clipId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (clipId: string) =>
    apiFetch<any>(`/clips/${clipId}`, {
      method: 'DELETE',
    }),

  claim: (clipId: string, data: { userId: string }) =>
    apiFetch<any>(`/clips/${clipId}/claim`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  complete: (clipId: string, data: { displayLabel: string; userId?: string }) =>
    apiFetch<any>(`/clips/${clipId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendToEditorHub: (clipId: string, data: { editingInstructions?: string; editorialNotes?: string }) =>
    apiFetch<any>(`/clips/${clipId}/send-to-editor-hub`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ═══════════════════════════════════════
// RUNDOWNS
// ═══════════════════════════════════════

export const rundownsApi = {
  list: (filters?: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : '';
    return apiFetch<any[]>(`/rundowns${query}`);
  },

  get: (rundownId: string) =>
    apiFetch<any>(`/rundowns/${rundownId}`),

  create: (data: any) =>
    apiFetch<any>('/rundowns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (rundownId: string, data: any) =>
    apiFetch<any>(`/rundowns/${rundownId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getEntries: (rundownId: string) =>
    apiFetch<any[]>(`/rundowns/${rundownId}/entries`),

  addEntry: (rundownId: string, data: { storyId: string; userId?: string }) =>
    apiFetch<any>(`/rundowns/${rundownId}/entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reorderEntries: (rundownId: string, data: { entryIds: string[] }) =>
    apiFetch<any>(`/rundowns/${rundownId}/entries/reorder`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getEntry: (rundownId: string, entryId: string) =>
    apiFetch<any>(`/rundowns/${rundownId}/entries/${entryId}`),

  updateEntry: (rundownId: string, entryId: string, data: any) =>
    apiFetch<any>(`/rundowns/${rundownId}/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteEntry: (rundownId: string, entryId: string) =>
    apiFetch<any>(`/rundowns/${rundownId}/entries/${entryId}`, {
      method: 'DELETE',
    }),
};

// ═══════════════════════════════════════
// USERS
// ═══════════════════════════════════════

export const usersApi = {
  list: (role?: string) => {
    const query = role ? `?role=${role}` : '';
    return apiFetch<any[]>(`/users${query}`);
  },
};

// ═══════════════════════════════════════
// AUDIT
// ═══════════════════════════════════════

export const auditApi = {
  list: (filters?: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : '';
    return apiFetch<any[]>(`/audit${query}`);
  },
};
