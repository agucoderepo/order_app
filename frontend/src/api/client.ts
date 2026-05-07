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

// ── Handle 401 globally and normalise FastAPI error shapes ───────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = String(err.config?.url ?? '');

    if (status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/';
    }

    // FastAPI 422 returns detail as an array of validation objects.
    // Flatten to a plain string so components can safely render it.
    if (err.response?.data?.detail && Array.isArray(err.response.data.detail)) {
      err.response.data.detail = err.response.data.detail
        .map((d: any) => d.msg ?? JSON.stringify(d))
        .join('; ');
    }

    return Promise.reject(err);
  }
);

export default apiClient;