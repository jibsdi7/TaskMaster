import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Read the JWT from Zustand's persisted auth-storage */
export function getToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const { state } = JSON.parse(raw);
    const t = state?.accessToken;
    return t && t !== 'dev-mode-no-token-required' ? t : null;
  } catch {
    return null;
  }
}

/** Auth header object — pass directly to fetch() headers */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const apiClient = axios.create({ baseURL: BASE_URL });

// Attach token to every axios request automatically
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { BASE_URL };
export default apiClient;
