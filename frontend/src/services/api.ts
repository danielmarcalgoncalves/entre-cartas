/**
 * API Communication Service for Between Letters (Entre Cartas)
 * Connects the Next.js Frontend to the Express Backend endpoints
 */

const API_BASE = '/api';
export const SESSION_TOKEN_STORAGE_KEY = 'entre-cartas:auth:token';

let inMemoryToken: string | null = null;

export function syncInMemoryTokenFromStorage(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const saved =
        window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY) ||
        window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
      inMemoryToken = saved || null;
      return inMemoryToken;
    } catch {}
  }
  return inMemoryToken;
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return syncInMemoryTokenFromStorage();
  }
  return inMemoryToken;
}

export function setSession(token: string | null, persist = true) {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        if (persist) {
          window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
        } else {
          window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
          window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
        }
      } else {
        window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
        window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      }
    } catch {}
  }
}

export function clearSession() {
  inMemoryToken = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    } catch {}
  }
}

async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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
    const errorMsg = data.error || data.message || `Request failed (${response.status})`;
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.code = data.code;
    err.feature = data.feature;
    err.currentUsage = data.currentUsage;
    err.freePlanLimit = data.freePlanLimit;
    err.proPlanLimit = data.proPlanLimit;
    err.upgradeAvailable = data.upgradeAvailable;
    err.upgradeDestination = data.upgradeDestination || '/clube-pro';
    err.details = data.details;
    err.upgrade = data.upgrade;
    err.requireVerification = data.requireVerification;
    err.email = data.email;
    err.isLimitReached = Boolean(data.isLimitReached || data.limite || data.code === 'PLAN_LIMIT_REACHED');
    err.limite = data.limite || data.freePlanLimit;
    err.upgradeToPremium = Boolean(data.upgradeToPremium || data.upgradeAvailable);
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
      const token = getToken();
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to upload photograph');
      return data;
    },
  },

  admin: {
    getMetrics: () => apiRequest('/admin/metrics'),
    getUsers: (params?: {
      page?: number;
      limit?: number;
      q?: string;
      plan?: string;
      subscriptionStatus?: string;
    }) => {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.q) sp.append('q', params.q);
      if (params?.plan && params.plan !== 'all') sp.append('plan', params.plan);
      if (params?.subscriptionStatus && params.subscriptionStatus !== 'all') {
        sp.append('subscriptionStatus', params.subscriptionStatus);
      }
      const qs = sp.toString();
      return apiRequest(`/admin/users${qs ? `?${qs}` : ''}`);
    },
    getUserDetail: (id: number | string) => apiRequest(`/admin/users/${encodeURIComponent(String(id))}`),
    getLogs: (params?: {
      page?: number;
      limit?: number;
      userId?: string | number;
      eventType?: string;
      action?: string;
      from?: string;
      to?: string;
      q?: string;
    }) => {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.userId) sp.append('userId', String(params.userId));
      if (params?.eventType && params.eventType !== 'all') sp.append('eventType', params.eventType);
      if (params?.action) sp.append('action', params.action);
      if (params?.from) sp.append('from', params.from);
      if (params?.to) sp.append('to', params.to);
      if (params?.q) sp.append('q', params.q);
      const qs = sp.toString();
      return apiRequest(`/admin/logs${qs ? `?${qs}` : ''}`);
    },
  },
};
