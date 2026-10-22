/**
 * Serviço de Comunicação com a API do Entre Cartas
 * Conecta o Frontend Next.js aos endpoints do Backend Express
 */

const API_BASE = '/api';

let inMemoryToken: string | null = null;

export function getToken(): string | null {
  return inMemoryToken;
}

export function setSession(token: string | null) {
  inMemoryToken = token;
}

export function clearSession() {
  inMemoryToken = null;
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
    const errorMsg = data.error || data.message || `Erro na requisição (${response.status})`;
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
    categorias: () => apiRequest('/cartas/categorias'),
    enviar: (dados: any) =>
      apiRequest('/cartas', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    adicionarNota: (id: string | number, texto: string) =>
      apiRequest(`/cartas/${id}/notas`, {
        method: 'POST',
        body: JSON.stringify({ texto }),
      }),
  },

  auth: {
    me: () => apiRequest('/auth/me'),
    login: (email: string, senha: string) =>
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
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
