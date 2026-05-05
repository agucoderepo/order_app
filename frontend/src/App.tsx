import { useState } from 'react';
import { useAuth, useToast } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Users from './pages/Users.tsx';
import './styles/globals.css';

type Page = 'dashboard' | 'users';

const PAGE_META: Record<Page, { title: string; sub: string }> = {
  dashboard: { title: 'Dashboard',        sub: 'Overview and quick access' },
  users:     { title: 'User management',  sub: 'Create, edit and deactivate accounts' },
};

export default function App() {
  const { user, authed, loading, login, logout } = useAuth();
  const { toasts, add: toast } = useToast();
  const [page, setPage] = useState<Page>('dashboard');

  // Still resolving token → show nothing (avoids flash)
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" />
      </div>
    );
  }

  if (!authed) {
    return (
      <>
        <Login onLogin={login} />
        <Toast toasts={toasts} />
      </>
    );
  }

  const meta = PAGE_META[page];

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar page={page} setPage={(p) => setPage(p as Page)} user={user} onLogout={logout} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'auto' }}>
          {/* Topbar */}
          <div style={{
            padding: '20px 32px', borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{meta.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>{meta.sub}</div>
          </div>

          {/* Page content */}
          <div style={{ padding: '28px 32px', flex: 1 }}>
            {page === 'dashboard' && <Dashboard user={user} />}
            {page === 'users'     && <Users currentUser={user} toast={toast} />}
          </div>
        </div>
      </div>

      <Toast toasts={toasts} />
    </>
  );
}