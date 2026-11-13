/**
 * API Communication Service for Between Letters (Entre Cartas)
 * Connects the Next.js Frontend to the Express Backend endpoints
 */

const API_BASE = '/api';
export const SESSION_TOKEN_STORAGE_KEY = 'entre-cartas:auth:token';

export function purgeLegacyTokenStorage(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    } catch {}
  }
}

export function syncInMemoryTokenFromStorage(): string | null {
  purgeLegacyTokenStorage();
  return null;
}

export function getToken(): string | null {
  return null;
}

export function setSession(_token: string | null, _persist = true) {
  purgeLegacyTokenStorage();
}

export function clearSession() {
  purgeLegacyTokenStorage();
}

async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  purgeLegacyTokenStorage();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('entre-cartas:unauthorized'));
      }
    }
    const errorMsg = data.message || data.error || `Request failed (${response.status})`;
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.code = data.error;
    err.details = data.details;
    err.upgrade = data.upgrade;
    err.requireVerification = data.requireVerification;
    err.email = data.email;
    err.isLimitReached = Boolean(
      data.error === 'PLAN_LIMIT_REACHED' || data.isLimitReached || data.limite
    );
    err.limite = data.limite;
    err.upgradeToPremium = data.upgradeToPremium;
    throw err;
  }

  return data as T;
}

export const api = {
  cartas: {
    listar: (params?: { categoria?: string; tipo_papel?: string; q?: string; ordem?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.categoria && params.categoria !== 'todas' && params.categoria !== 'all') {
        searchParams.append('categoria', params.categoria);
      }
      if (params?.tipo_papel && params.tipo_papel !== 'todos') {
        searchParams.append('tipo_papel', params.tipo_papel);
      }
      if (params?.q) searchParams.append('q', params.q);
      if (params?.ordem) searchParams.append('ordem', params.ordem);
      if (params?.page) searchParams.append('page', String(params.page));
      if (params?.limit) searchParams.append('limit', String(params.limit));

      const qs = searchParams.toString();
      return apiRequest(`/cartas${qs ? `?${qs}` : ''}`);
    },
    obter: (id: string | number) => apiRequest(`/cartas/${id}`),
    carimbar: (id: string | number, tipo_carimbo = 'LIDA') =>
      apiRequest(`/cartas/${id}/carimbar`, {
        method: 'POST',
        body: JSON.stringify({ tipo_carimbo }),
      }),
    descarimbar: (id: string | number) =>
      apiRequest(`/cartas/${id}/carimbar`, {
        method: 'DELETE',
      }),
    guardadas: () => apiRequest('/cartas/guardadas'),
    minhas: () => apiRequest('/cartas/minhas'),
    categorias: () => apiRequest('/cartas/categorias'),
    enviar: (dados: any) =>
      apiRequest('/cartas', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    atualizar: (id: string | number, dados: any) =>
      apiRequest(`/cartas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dados),
      }),
    excluir: (id: string | number) =>
      apiRequest(`/cartas/${id}`, {
        method: 'DELETE',
      }),
    setTrash: (id: string | number, na_lixeira: boolean) =>
      apiRequest(`/cartas/${id}/trash`, {
        method: 'PATCH',
        body: JSON.stringify({ na_lixeira }),
      }),
    adicionarNota: (id: string | number, texto: string) =>
      apiRequest(`/cartas/${id}/notas`, {
        method: 'POST',
        body: JSON.stringify({ texto }),
      }),
  },

  journal: {
    listNotebooks: () => apiRequest('/journal/notebooks'),
    upsertNotebook: (clientId: string, dados: { nome: string; corCapa: string; paginas: any[] }) =>
      apiRequest(`/journal/notebooks/${encodeURIComponent(clientId)}`, {
        method: 'PUT',
        body: JSON.stringify(dados),
      }),
    deleteNotebook: (clientId: string) =>
      apiRequest(`/journal/notebooks/${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
      }),
    uploadMedia: async (
      clientId: string,
      file: File
    ): Promise<{ objectKey: string; url: string; mimeType: string; size: number }> => {
      const formData = new FormData();
      formData.append('photo', file);
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(
        `${API_BASE}/journal/notebooks/${encodeURIComponent(clientId)}/media`,
        {
          method: 'POST',
          credentials: 'include',
          headers,
          body: formData,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          clearSession();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('entre-cartas:unauthorized'));
          }
        }
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      return data;
    },
    listFolders: () => apiRequest('/journal/folders'),
    upsertFolder: (clientId: string, dados: { nome: string; cor?: string }) =>
      apiRequest(`/journal/folders/${encodeURIComponent(clientId)}`, {
        method: 'PUT',
        body: JSON.stringify(dados),
      }),
    deleteFolder: (clientId: string) =>
      apiRequest(`/journal/folders/${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
      }),
  },

  auth: {
    me: () => apiRequest('/auth/me'),
    login: (email: string, senha: string, rememberMe = true) =>
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha, rememberMe }),
      }),
    register: (nome: string, email: string, senha: string) =>
      apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nome, email, senha }),
      }),
    verifyEmail: (email: string, codigo: string) =>
      apiRequest('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, codigo }),
      }),
    resendOtp: (email: string) =>
      apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    forgotPassword: (email: string) =>
      apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    validateResetToken: (token: string) =>
      apiRequest(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`),
    resetPassword: (token: string, novaSenha: string) =>
      apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, novaSenha }),
      }),
    googleStatus: () => apiRequest<{ configured: boolean }>('/auth/google/status'),
    logout: () =>
      apiRequest('/auth/logout', {
        method: 'POST',
      }),
  },

  stripe: {
    createCheckout: () =>
      apiRequest('/stripe/checkout', {
        method: 'POST',
      }),
    getStatus: () => apiRequest('/stripe/status'),
    createPortalSession: () =>
      apiRequest('/stripe/portal', {
        method: 'POST',
      }),
  },

  profile: {
    get: () => apiRequest('/profile'),
    update: (dados: { nome?: string; bio?: string | null; onboarding_concluido?: boolean }) =>
      apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify(dados),
      }),
    uploadAvatar: async (formData: FormData) => {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to upload photograph');
      return data;
    },
  },

  admin: {
    getLogs: () => apiRequest('/admin/logs', { cache: 'no-store' }),
    getMetrics: () => apiRequest('/admin/metrics', { cache: 'no-store' }),
    getUsers: (params?: { page?: number; limit?: number; q?: string; cursor?: number | null; direction?: 'next' | 'prev' }) => {
      const sp = new URLSearchParams();
      if (params?.cursor) sp.set('cursor', String(params.cursor));
      if (params?.direction) sp.set('direction', params.direction);
      if (params?.page && !params?.cursor) sp.set('page', String(params.page));
      if (params?.limit) sp.set('limit', String(Math.min(params.limit, 20)));
      if (params?.q && params.q.trim()) sp.set('q', params.q.trim());
      const qs = sp.toString();
      return apiRequest(`/admin/users${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
    },
    getUserDetail: (id: number) =>
      apiRequest(`/admin/users/${encodeURIComponent(String(id))}`, { cache: 'no-store' }),
  },
};
