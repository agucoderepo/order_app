import { useTranslation } from 'react-i18next';
import type { User } from '../types';

interface NavItem { id: string; icon: string; adminOnly?: boolean; }

const NAV: NavItem[] = [
  { id: 'dashboard',       icon: '⊞' },
  { id: 'users',           icon: '◎', adminOnly: true },
  { id: 'clients',         icon: '◑', adminOnly: true },
  { id: 'providers',       icon: '◐', adminOnly: true },
  { id: 'products',        icon: '▣', adminOnly: true },
  { id: 'orders',          icon: '◈' },
  { id: 'shopping-lists',  icon: '▤' },
  { id: 'purchase-orders', icon: '◻' },
  { id: 'invoices',        icon: '◫', adminOnly: true },
  { id: 'audit-log',       icon: '▦', adminOnly: true },
];

function navKey(id: string) {
  return id.replace(/-/g, '_');
}

interface Props {
  page: string;
  setPage: (p: string) => void;
  user: User | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ page, setPage, user, onLogout, isOpen }: Props) {
  const { t } = useTranslation();
  const visibleNav = NAV.filter((n) => !n.adminOnly || user?.role === 'admin');

  const panelLabel = user?.role === 'admin' ? t('nav.admin_panel') : t('nav.operator_panel');

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`} style={{
      width: 220, flexShrink: 0,
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '24px 0',
      position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: '0 20px 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
          OrderApp
        </div>
        <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
          {user ? panelLabel : ''}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visibleNav.map((n) => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, border: 'none', width: '100%', textAlign: 'left',
              transition: 'background .15s, color .15s',
              background: page === n.id ? 'rgba(200,240,74,.1)' : 'transparent',
              color: page === n.id ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'var(--sans)',
            }}
          >
            <span style={{ width: 16, textAlign: 'center', opacity: .8 }}>{n.icon}</span>
            {t(`nav.${navKey(n.id)}`)}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 12px 0', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '8px 10px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
            {user?.name ?? '—'}
          </div>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
            {user?.email}
          </div>
          <div style={{ marginTop: 6 }}>
            <span className={`badge badge-${user?.role}`}>
              <span className="dot" />{user?.role}
            </span>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onLogout} style={{ width: '100%' }}>
          {t('nav.sign_out')}
        </button>
      </div>
    </aside>
  );
}
