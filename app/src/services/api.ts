import type { Anecdote, ContinuityIssue, MovieProject, ProjectBeat, ProjectFinalFilm, ProjectScenesBible, ProjectScreenplay, ProjectStyleBible, RefinedSynopsis, ScenePromptLayer, SceneVideoJob, SceneVideoPromptTrace, StoryNote, Storyline, StoryboardScene, StorylineGenerationResult, StorylinePackageRecord } from '@/types';

// Get the base URL without /api suffix for uploads
const getBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  return apiUrl.replace('/api', '');
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const UPLOADS_BASE_URL = getBaseUrl();

const AUTH_TOKEN_STORAGE = 'semipro_auth_token';

const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_STORAGE);
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const authToken = getAuthToken();
  
  const headers: Record<string, string> = {
    ...options?.headers as Record<string, string>,
  };
  
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Get API base URL
  getApiBaseUrl: () => API_BASE_URL,

  // Get full URL for uploads
  getUploadsUrl: (path: string) => {
    const url = `${UPLOADS_BASE_URL}${path}`;
    const authToken = getAuthToken();
    if (!authToken) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(authToken)}`;
  },

  // Health check
  health: () => fetchApi<{ status: string; timestamp: string }>('/health'),

  // Image upload (requires auth)
  uploadImage: async (file: File): Promise<{ url: string; filename: string; success?: boolean }> => {
    const authToken = getAuthToken();
    const formData = new FormData();
    formData.append('image', file);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  // Multiple images upload (requires auth)
  uploadImages: async (files: File[]): Promise<{ files: Array<{ url: string; filename: string; originalName: string; size: number }> }> => {
    const authToken = getAuthToken();
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));

    const headers: Record<string, string> = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload/multiple`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  // Delete image (requires auth)
  deleteImage: (filename: string) => fetchApi<{ message: string }>(`/upload/${filename}`, {
    method: 'DELETE',
  }),

  // Anecdotes
  getAnecdotes: () => fetchApi<Anecdote[]>('/anecdotes'),
  
  getAnecdoteById: (id: string) => fetchApi<Anecdote>(`/anecdotes/${id}`),
  
  getAnecdotesByYear: (year: number) => fetchApi<Anecdote[]>(`/anecdotes/year/${year}`),
  
  // Create anecdote (requires auth)
  createAnecdote: (anecdote: Omit<Anecdote, 'id' | 'createdAt' | 'updatedAt'>) =>
    fetchApi<Anecdote>('/anecdotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(anecdote),
    }),
  
  // Update anecdote (requires auth)
  updateAnecdote: (id: string, updates: Partial<Anecdote>) =>
    fetchApi<Anecdote>(`/anecdotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }),
  
  // Delete anecdote (requires auth)
  deleteAnecdote: (id: string) => fetchApi<{ message: string }>(`/anecdotes/${id}`, {
    method: 'DELETE',
  }),

  // Graph data (public)
  getGraphData: () => fetchApi<{
    nodes: Array<{
      id: string;
      type: 'anecdote' | 'storyteller' | 'year' | 'tag';
      label: string;
    }>;
    links: Array<{
      source: string;
      target: string;
      type: 'date' | 'storyteller' | 'tag';
    }>;
  }>('/graph'),

  // Storylines
  getStorylines: () => fetchApi<Storyline[]>('/storylines'),

  // Save storylines (requires auth)
  saveStorylines: (storylines: Storyline[]) =>
    fetchApi<{ success: boolean; count: number }>('/storylines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storylines }),
    }),

  // Generate write-up + storyboard (requires auth)
  generateStoryPackage: (storyline: Storyline, prompt?: string) =>
    fetchApi<{ success: boolean; result: StorylineGenerationResult; package: StorylinePackageRecord }>('/storylines/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyline, prompt }),
    }),

  getLatestStorylinePackage: (storylineId: string) =>
    fetchApi<{ item: StorylinePackageRecord | null }>(`/storylines/package?storylineId=${encodeURIComponent(storylineId)}`),

  getStorylinePackages: (storylineId: string) =>
    fetchApi<{ items: StorylinePackageRecord[] }>(`/storylines/packages?storylineId=${encodeURIComponent(storylineId)}`),

  saveStorylinePackage: (storylineId: string, payload: StorylineGenerationResult, prompt: string, status: StorylinePackageRecord['status'] = 'draft') =>
    fetchApi<{ success: boolean; item: StorylinePackageRecord }>('/storylines/package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storylineId, payload, prompt, status }),
    }),

  regenerateStorylineScene: (storyline: Storyline, scene: StoryboardScene, prompt: string) =>
    fetchApi<{ success: boolean; scene: StoryboardScene }>('/storylines/scene/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyline, scene, prompt }),
    }),

  // Projects (movie studio)
  getProjects: () => fetchApi<MovieProject[]>('/projects'),

  createProject: (payload: { title?: string; pseudoSynopsis: string; style?: 'cinematic' | 'mainstream' | 'festival'; durationMinutes?: number }) =>
    fetchApi<MovieProject>('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  updateProject: (projectId: string, payload: { title?: string; pseudoSynopsis?: string }) =>
    fetchApi<{ success: boolean; item: MovieProject }>(`/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  softDeleteProject: (projectId: string) =>
    fetchApi<{ success: boolean }>(`/projects/${projectId}`, {
      method: 'DELETE',
    }),

  refineProjectSynopsis: (projectId: string) =>
    fetchApi<{ success: boolean; refined: RefinedSynopsis; project: MovieProject }>(`/projects/${projectId}/synopsis/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  getProjectNotes: (projectId: string) =>
    fetchApi<{ items: StoryNote[] }>(`/projects/${projectId}/notes`),

  addProjectNote: (projectId: string, payload: { rawText: string; source?: 'typed' | 'audio' | 'ai_starter'; transcript?: string; minuteMark?: number }) =>
    fetchApi<{ success: boolean; item: StoryNote }>(`/projects/${projectId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  polishProjectBeats: (projectId: string) =>
    fetchApi<{ success: boolean; items: ProjectBeat[] }>(`/projects/${projectId}/beats/polish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  getProjectBeats: (projectId: string) =>
    fetchApi<{ items: ProjectBeat[] }>(`/projects/${projectId}/beats`),

  setProjectBeatLock: (projectId: string, beatId: string, locked: boolean) =>
    fetchApi<{ success: boolean; item: ProjectBeat }>(`/projects/${projectId}/beats/${beatId}/lock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked }),
    }),

  getProjectStyleBible: (projectId: string) =>
    fetchApi<{ item: ProjectStyleBible }>(`/projects/${projectId}/style-bible`),

  updateProjectStyleBible: (projectId: string, payload: ProjectStyleBible) =>
    fetchApi<{ success: boolean; item: ProjectStyleBible }>(`/projects/${projectId}/style-bible`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    }),

  getProjectScreenplay: (projectId: string) =>
    fetchApi<{ item: ProjectScreenplay | null }>(`/projects/${projectId}/screenplay`),

  generateProjectScreenplay: (projectId: string) =>
    fetchApi<{ success: boolean; item: ProjectScreenplay }>(`/projects/${projectId}/screenplay/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  updateProjectScreenplay: (projectId: string, payload: ProjectScreenplay['payload']) =>
    fetchApi<{ success: boolean; item: ProjectScreenplay }>(`/projects/${projectId}/screenplay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    }),

  getProjectScenesBible: (projectId: string) =>
    fetchApi<{ item: ProjectScenesBible | null }>(`/projects/${projectId}/scenes-bible`),

  generateProjectScenesBible: (projectId: string) =>
    fetchApi<{ success: boolean; item: ProjectScenesBible }>(`/projects/${projectId}/scenes-bible/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  updateProjectScenesBible: (projectId: string, payload: ProjectScenesBible) =>
    fetchApi<{ success: boolean; item: ProjectScenesBible }>(`/projects/${projectId}/scenes-bible`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    }),

  checkProjectContinuity: (projectId: string) =>
    fetchApi<{ success: boolean; issues: ContinuityIssue[] }>(`/projects/${projectId}/continuity/check`),

  fixProjectContinuity: (projectId: string, mode: 'timeline' | 'intensity' | 'all' = 'all', dryRun: boolean = false) =>
    fetchApi<{ success: boolean; items: ProjectBeat[]; issues: ContinuityIssue[]; mode: 'timeline' | 'intensity' | 'all' }>(`/projects/${projectId}/continuity/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, dryRun }),
    }),

  generateProjectStoryboard: (projectId: string, prompt?: string, filmType?: string, imageModelKey?: 'fal' | 'grok') =>
    fetchApi<{ success: boolean; result: StorylineGenerationResult; package: StorylinePackageRecord }>(`/projects/${projectId}/storyboard/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt || '', filmType: filmType || '', imageModelKey: imageModelKey || 'fal' }),
    }),

  getLatestProjectStoryboard: (projectId: string) =>
    fetchApi<{ item: StorylinePackageRecord | null }>(`/projects/${projectId}/storyboard`),

  setProjectStoryboardSceneLock: (projectId: string, beatId: string, locked: boolean) =>
    fetchApi<{ success: boolean; item: StorylinePackageRecord }>(`/projects/${projectId}/storyboard/scene-lock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beatId, locked }),
    }),

  generateSceneVideo: (projectId: string, beatId: string, payload?: {
    directorPrompt?: string;
    cinematographerPrompt?: string;
    filmType?: string;
    imageModelKey?: 'fal' | 'grok';
    modelKey?: 'seedance' | 'kling' | 'veo3';
    continuationMode?: 'off' | 'strict' | 'balanced' | 'loose';
    anchorBeatId?: string;
    autoRegenerateThreshold?: number;
    prompt?: string;
  }) =>
    fetchApi<{ success: boolean; item: SceneVideoJob; promptLayer?: ScenePromptLayer }>(`/projects/${projectId}/storyboard/${beatId}/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    }),

  getSceneVideo: (projectId: string, beatId: string) =>
    fetchApi<{ item: SceneVideoJob | null }>(`/projects/${projectId}/storyboard/${beatId}/video`),

  listSceneVideos: (projectId: string) =>
    fetchApi<{ items: SceneVideoJob[] }>(`/projects/${projectId}/storyboard/videos`),

  listScenePromptLayers: (projectId: string) =>
    fetchApi<{ items: ScenePromptLayer[] }>(`/projects/${projectId}/storyboard/prompt-layers`),

  getScenePromptLayerHistory: (projectId: string, beatId: string) =>
    fetchApi<{ items: ScenePromptLayer[] }>(`/projects/${projectId}/storyboard/${beatId}/prompt-layers`),

  listSceneVideoPromptTraces: (projectId: string, beatId: string, limit: number = 20) =>
    fetchApi<{ items: SceneVideoPromptTrace[] }>(`/projects/${projectId}/storyboard/${beatId}/video-traces?limit=${encodeURIComponent(String(limit))}`),

  saveScenePromptLayer: (projectId: string, beatId: string, payload: {
    directorPrompt?: string;
    cinematographerPrompt?: string;
    filmType?: string;
    modelKey?: 'seedance' | 'kling' | 'veo3';
    continuationMode?: 'off' | 'strict' | 'balanced' | 'loose';
    anchorBeatId?: string;
    autoRegenerateThreshold?: number;
    source?: string;
  }) =>
    fetchApi<{ success: boolean; item: ScenePromptLayer }>(`/projects/${projectId}/storyboard/${beatId}/prompt-layers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    }),

  getLatestProjectFinalFilm: (projectId: string) =>
    fetchApi<{ item: ProjectFinalFilm | null }>(`/projects/${projectId}/final-film`),

  generateProjectFinalFilm: (projectId: string) =>
    fetchApi<{ success: boolean; item: ProjectFinalFilm }>(`/projects/${projectId}/final-film/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  setAuthToken: (token: string | null) => {
    if (token) localStorage.setItem(AUTH_TOKEN_STORAGE, token);
    else localStorage.removeItem(AUTH_TOKEN_STORAGE);
  },

  register: (payload: { email: string; password: string; accountName?: string }) =>
    fetchApi<{ success: boolean; token: string; expiresAt: number; user: { id: string; email: string; name: string }; account: { id: string; name: string; slug: string; plan: string }; memberships: Array<{ accountId: string; accountName: string; accountSlug: string; accountPlan: string; role: string }> }>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string; accountSlug?: string }) =>
    fetchApi<{ success: boolean; token: string; expiresAt: number; user: { id: string; email: string; name: string }; account: { id: string; name: string; slug: string; plan: string }; memberships: Array<{ accountId: string; accountName: string; accountSlug: string; accountPlan: string; role: string }> }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  loginWithGoogle: (payload: { idToken: string; accountName?: string; accountSlug?: string }) =>
    fetchApi<{ success: boolean; token: string; expiresAt: number; user: { id: string; email: string; name: string }; account: { id: string; name: string; slug: string; plan: string }; memberships: Array<{ accountId: string; accountName: string; accountSlug: string; accountPlan: string; role: string }> }>('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  switchAccount: (payload: { accountId?: string; accountSlug?: string }) =>
    fetchApi<{ success: boolean; token: string; expiresAt: number; account: { id: string; name: string; slug: string; plan: string }; memberships: Array<{ accountId: string; accountName: string; accountSlug: string; accountPlan: string; role: string }> }>('/auth/switch-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  logout: () =>
    fetchApi<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  getCurrentUser: () =>
    fetchApi<{ user: { id: string; email: string; name: string }; account: { id: string; name: string; slug: string }; memberships: Array<{ accountId: string; accountName: string; accountSlug: string; accountPlan: string; role: string }> }>('/auth/me'),

  getAccount: () =>
    fetchApi<{ account: { id: string; name: string; slug: string; plan: string; status: string } }>('/account'),

  updateAccount: (payload: { name: string; slug?: string }) =>
    fetchApi<{ success: boolean; account: { id: string; name: string; slug: string; plan: string; status: string } }>('/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

};
