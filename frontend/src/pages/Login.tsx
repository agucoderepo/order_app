import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import type { LoginRequest } from '../types';

interface Props {
  onLogin: (data: LoginRequest) => Promise<void>;
}

export default function Login({ onLogin }: Props) {
  const { t } = useTranslation();
  const [form, setForm]     = useState<LoginRequest>({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await onLogin(form);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? t('login.invalid_credentials')
        : (typeof detail === 'string' ? detail : err.message ?? t('login.login_failed'));
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)',
            letterSpacing: '.15em', textTransform: 'uppercase',
          }}>
            {t('login.system_name')}
          </div>
          <LanguageSwitcher />
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{t('login.welcome')}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
          {t('login.subtitle')}
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>{t('login.email')}</label>
            <input
              type="email"
              value={form.email}
              autoComplete="email"
              placeholder={t('login.email_placeholder')}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label>{t('login.password')}</label>
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
            {loading ? <span className="spinner" /> : t('login.sign_in')}
          </button>
        </form>
      </div>
    </div>
  );
}
