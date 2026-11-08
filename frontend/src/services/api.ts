/**
 * API Communication Service for Between Letters (Entre Cartas)
 * Connects the Next.js Frontend to the Express Backend endpoints
 */

const API_BASE = '/api';
const SESSION_TOKEN_STORAGE_KEY = 'entre-cartas:auth:token';

let inMemoryToken: string | null = null;

export function getToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    try {
      const saved =
        window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY) ||
        window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
      if (saved) {
        inMemoryToken = saved;
        return saved;
      }
    } catch {}
  }
  return null;
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
    }
    const errorMsg = data.error || data.message || `Request failed (${response.status})`;
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.requireVerification = data.requireVerification;
    err.email = data.email;
    err.isLimitReached = Boolean(data.isLimitReached || data.limite);
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
    adicionarNota: (id: string | number, texto: string) =>
      apiRequest(`/cartas/${id}/notas`, {
        method: 'POST',
        body: JSON.stringify({ texto }),
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
      apiRequest('/stripe/customer-portal', {
        method: 'POST',
      }),
  },

  admin: {
    getLogs: () => apiRequest('/admin/logs'),
  },
};
