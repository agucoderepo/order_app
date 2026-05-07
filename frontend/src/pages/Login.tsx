import { useState } from 'react';
import type { LoginRequest } from '../types';

interface Props {
  onLogin: (data: LoginRequest) => Promise<void>;
}

export default function Login({ onLogin }: Props) {
  const [form, setForm]     = useState<LoginRequest>({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await onLogin(form);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? 'Invalid email or password'
        : (typeof detail === 'string' ? detail : err.message ?? 'Login failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(200,240,74,.1), transparent)',
    }}>
      <div style={{
        width: 380, padding: '40px 36px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
      }}>
        <div style={{
          fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)',
          letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 28,
        }}>
          Order Management System
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Welcome back</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
          Sign in to your account to continue
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
          </div>

          {error && <div className="error-text">{error}</div>}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}