import type { User } from '../types';

interface Props { user: User | null; }

const UPCOMING = [
  { id: 'clients',   label: 'Clients',   desc: 'Manage people who place orders',      icon: '◑' },
  { id: 'providers', label: 'Providers', desc: 'Manage suppliers and their products',  icon: '◐' },
  { id: 'products',  label: 'Products',  desc: 'Product catalogue with pricing',       icon: '▣' },
  { id: 'orders',    label: 'Orders',    desc: 'Create and track daily orders',        icon: '◈' },
];

export default function Dashboard({ user }: Props) {
  return (
    <div>
      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Signed in as
          </div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{user?.name ?? '—'}</div>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 4 }}>{user?.email}</div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Role
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{user?.role}</div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Status
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent2)' }}>active</div>
        </div>
      </div>

      {/* Coming soon modules */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Upcoming modules</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>
            These sections will be added as the app grows
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0 }}>
          {UPCOMING.map((m, i) => (
            <div key={m.id} style={{
              padding: '20px 24px',
              borderRight: i % 2 === 0 ? '1px solid var(--border)' : 'none',
              borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
              opacity: .5,
            }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}