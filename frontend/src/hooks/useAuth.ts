import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import type { User, LoginRequest } from '../types';

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed]   = useState(!!localStorage.getItem('access_token'));

  // Load profile when authed
  useEffect(() => {
    if (!authed) { setLoading(false); return; }
    authApi.me()
      .then((u) => { setUser(u); setLoading(false); })
      .catch(() => { authApi.logout(); setAuthed(false); setLoading(false); });
  }, [authed]);

  const login = useCallback(async (data: LoginRequest) => {
    const tokens = await authApi.login(data);
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    setAuthed(true);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setAuthed(false);
  }, []);

  return { user, authed, loading, login, logout };
}

// ─── Toast hook ───────────────────────────────────────────────────────────────
import type { ToastItem, ToastType } from '../types';

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  }, []);

  return { toasts, add };
}