import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { permissionsApi } from '../api/permissions';
import RolePermissionsEditor from '../components/permissions/RolePermissionsEditor';
import UserOverridesPanel from '../components/permissions/UserOverridesPanel';
import type { Permission, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

type Tab = 'roles' | 'users';

export default function Permissions({ toast }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('roles');
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    permissionsApi.listAll()
      .then(setAllPermissions)
      .catch(() => toast(t('permissions.load_error'), 'error'))
      .finally(() => setLoading(false));
  }, [toast, t]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'transparent',
    color: active ? 'var(--accent)' : 'var(--muted)',
    fontFamily: 'var(--sans)',
    transition: 'color .15s',
  });

  return (
    <>
      {/* Stats strip */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: t('permissions.stat_total'),    value: allPermissions.length,                       color: 'var(--accent)' },
          { label: t('permissions.stat_resources'), value: new Set(allPermissions.map((p) => p.name.split(':')[0])).size, color: 'var(--accent2)' },
          { label: t('permissions.stat_crossuser'), value: allPermissions.filter((p) => p.name.endsWith(':all')).length, color: 'var(--muted)' },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '20px 22px',
          }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab container */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {/* Tab header */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 8px' }}>
          <button style={tabStyle(tab === 'roles')} onClick={() => setTab('roles')}>
            {t('permissions.tab_roles')}
          </button>
          <button style={tabStyle(tab === 'users')} onClick={() => setTab('users')}>
            {t('permissions.tab_users')}
          </button>
        </div>

        {/* Tab body */}
        <div style={{ padding: 24 }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}><span className="spinner" /></div>
          ) : tab === 'roles' ? (
            <RolePermissionsEditor allPermissions={allPermissions} toast={toast} />
          ) : (
            <UserOverridesPanel allPermissions={allPermissions} toast={toast} />
          )}
        </div>
      </div>
    </>
  );
}
