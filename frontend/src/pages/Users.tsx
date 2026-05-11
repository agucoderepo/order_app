import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/users';
import UserTable from '../components/users/UserTable';
import UserModal from '../components/users/UserModal';
import ConfirmDeactivate from '../components/users/ConfirmDeactivate';
import type { User, ToastType } from '../types';

interface Props {
  currentUser: User | null;
  toast: (msg: string, type?: ToastType) => void;
}

type Modal =
  | { mode: 'create' }
  | { mode: 'edit'; user: User }
  | { mode: 'confirm'; user: User }
  | null;

export default function Users({ currentUser, toast }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await usersApi.list());
    } catch (e: any) {
      toast(e.response?.data?.detail ?? 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const admins = users.filter((u) => u.role === 'admin' && u.is_active).length;
  const operators = users.filter((u) => u.role === 'operator' && u.is_active).length;
  const inactive = users.filter((u) => !u.is_active).length;

  return (
    <>
      <div className="stat-grid">
        {[
          { label: 'Total users', value: users.length, color: 'var(--accent)' },
          { label: 'Admins / Operators', value: `${admins} / ${operators}`, color: 'var(--accent2)' },
          { label: 'Inactive', value: inactive, color: 'var(--danger)' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '20px 22px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: 'var(--muted)',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>All users</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="toolbar-search"
              style={{ width: 200 }}
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create' })}>
              + New user
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <span className="spinner" />
          </div>
        ) : (
          <UserTable
            users={filtered}
            currentUserId={currentUser?.id}
            onEdit={(u) => setModal({ mode: 'edit', user: u })}
            onDeactivate={(u) => setModal({ mode: 'confirm', user: u })}
          />
        )}
      </div>

      {modal?.mode === 'create' && (
        <UserModal toast={toast} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.mode === 'edit' && (
        <UserModal
          user={modal.user}
          toast={toast}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal?.mode === 'confirm' && (
        <ConfirmDeactivate
          user={modal.user}
          toast={toast}
          onClose={() => setModal(null)}
          onDeactivated={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </>
  );
}
