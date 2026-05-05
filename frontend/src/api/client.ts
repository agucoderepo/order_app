import axios from 'axios';

const apiClient = axios.create({
  // Uses the Vite proxy — /api is rewritten to http://localhost:8000
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach token to every request ────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Handle 401 globally — clear session and redirect to login ─────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = String(err.config?.url ?? '');
    const isLoginRequest = url.includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default apiClient;