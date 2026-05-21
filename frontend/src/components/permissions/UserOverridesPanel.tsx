import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { permissionsApi } from '../../api/permissions';
import { usersApi } from '../../api/users';
import type { Permission, User, UserPermissionOverride, ToastType } from '../../types';

interface Props {
  allPermissions: Permission[];
  toast: (msg: string, type?: ToastType) => void;
}

export default function UserOverridesPanel({ allPermissions, toast }: Props) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [overrides, setOverrides] = useState<UserPermissionOverride[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [addPerm, setAddPerm] = useState('');
  const [addGranted, setAddGranted] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    usersApi.list()
      .then(setUsers)
      .catch(() => toast(t('permissions.users_load_error'), 'error'))
      .finally(() => setLoadingUsers(false));
  }, [toast, t]);

  const loadOverrides = useCallback(async (userId: string) => {
    if (!userId) return;
    setLoadingOverrides(true);
    try {
      setOverrides(await permissionsApi.getUserOverrides(userId));
    } catch {
      toast(t('permissions.load_error'), 'error');
    } finally {
      setLoadingOverrides(false);
    }
  }, [toast, t]);

  const selectUser = (id: string) => {
    setSelectedUserId(id);
    setAddPerm('');
    loadOverrides(id);
  };

  const addOverride = async () => {
    if (!addPerm || !selectedUserId) return;
    setSaving(true);
    try {
      await permissionsApi.setUserOverride(selectedUserId, addPerm, addGranted);
      toast(t('permissions.override_saved'), 'success');
      setAddPerm('');
      loadOverrides(selectedUserId);
    } catch (e: any) {
      toast(e.response?.data?.detail ?? t('common.something_went_wrong'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeOverride = async (permName: string) => {
    if (!selectedUserId) return;
    setDeleting(permName);
    try {
      await permissionsApi.deleteUserOverride(selectedUserId, permName);
      toast(t('permissions.override_removed'), 'success');
      setOverrides((prev) => prev.filter((o) => o.permission_name !== permName));
    } catch (e: any) {
      toast(e.response?.data?.detail ?? t('common.something_went_wrong'), 'error');
    } finally {
      setDeleting(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Permissions not yet overridden for the selected user
  const overriddenNames = new Set(overrides.map((o) => o.permission_name));
  const availableToAdd = allPermissions.filter((p) => !overriddenNames.has(p.name));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

      {/* User list */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <input
            className="toolbar-search"
            style={{ width: '100%' }}
            placeholder={t('permissions.search_user')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loadingUsers ? (
          <div style={{ padding: 24, textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => selectUser(u.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 12px', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: selectedUserId === u.id ? 'rgba(200,240,74,.08)' : 'transparent',
                  transition: 'background .1s',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{u.role}</div>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                {t('permissions.no_users_found')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overrides panel */}
      <div>
        {!selectedUser ? (
          <div style={{
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '48px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13,
          }}>
            {t('permissions.select_user_prompt')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Selected user header */}
            <div style={{
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: '14px 16px', background: 'var(--surface)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{selectedUser.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{selectedUser.email}</div>
              </div>
              <span className={`badge badge-${selectedUser.role}`}><span className="dot" />{selectedUser.role}</span>
            </div>

            {/* Add override */}
            <div style={{
              border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 700 }}>
                {t('permissions.add_override')}
              </div>
              <div style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>{t('permissions.permission')}</label>
                  <select value={addPerm} onChange={(e) => setAddPerm(e.target.value)}>
                    <option value="">{t('permissions.select_permission')}</option>
                    {availableToAdd.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — {t(`perm_desc.${p.name.replace(/:/g, '_')}`, { defaultValue: p.description ?? p.name })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>{t('permissions.effect')}</label>
                  <select value={addGranted ? 'grant' : 'deny'} onChange={(e) => setAddGranted(e.target.value === 'grant')}>
                    <option value="grant">{t('permissions.grant')}</option>
                    <option value="deny">{t('permissions.deny')}</option>
                  </select>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={addOverride}
                  disabled={!addPerm || saving}
                  style={{ flexShrink: 0 }}
                >
                  {saving ? <span className="spinner" /> : t('permissions.add')}
                </button>
              </div>
            </div>

            {/* Current overrides */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 700 }}>
                {t('permissions.active_overrides')} ({overrides.length})
              </div>
              {loadingOverrides ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}><span className="spinner" /></div>
              ) : overrides.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  {t('permissions.no_overrides')}
                </div>
              ) : (
                overrides.map((o) => (
                  <div
                    key={o.permission_name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: o.granted ? 'var(--accent)' : 'var(--danger)',
                    }} />
                    <span style={{ flex: 1, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                      {o.permission_name}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--mono)',
                      background: o.granted ? 'rgba(200,240,74,.12)' : 'rgba(255,80,80,.12)',
                      color: o.granted ? 'var(--accent)' : 'var(--danger)',
                    }}>
                      {o.granted ? t('permissions.grant') : t('permissions.deny')}
                    </span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeOverride(o.permission_name)}
                      disabled={deleting === o.permission_name}
                      style={{ padding: '3px 10px' }}
                    >
                      {deleting === o.permission_name ? <span className="spinner" /> : '✕'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
