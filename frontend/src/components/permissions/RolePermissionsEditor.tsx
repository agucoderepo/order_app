import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { permissionsApi } from '../../api/permissions';
import type { Permission, ToastType } from '../../types';

interface Props {
  allPermissions: Permission[];
  toast: (msg: string, type?: ToastType) => void;
}

// Group permissions by the resource prefix (before the first ':')
function groupByResource(permissions: Permission[]): Record<string, Permission[]> {
  const groups: Record<string, Permission[]> = {};
  for (const p of permissions) {
    const resource = p.name.split(':')[0];
    if (!groups[resource]) groups[resource] = [];
    groups[resource].push(p);
  }
  return groups;
}

const ROLES = ['admin', 'operator'];

export default function RolePermissionsEditor({ allPermissions, toast }: Props) {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState('operator');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await permissionsApi.getRolePermissions(selectedRole);
      setChecked(new Set(data.permissions));
    } catch {
      toast(t('permissions.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedRole, toast, t]);

  useEffect(() => { load(); }, [load]);

  const toggle = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleResource = (perms: Permission[]) => {
    const allOn = perms.every((p) => checked.has(p.name));
    setChecked((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (allOn) next.delete(p.name); else next.add(p.name);
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await permissionsApi.updateRolePermissions(selectedRole, [...checked]);
      toast(t('permissions.role_saved'), 'success');
    } catch (e: any) {
      toast(e.response?.data?.detail ?? t('common.something_went_wrong'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const groups = groupByResource(allPermissions);

  return (
    <div>
      {/* Role tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`btn btn-sm ${selectedRole === role ? 'btn-primary' : 'btn-ghost'}`}
          >
            {role}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}><span className="spinner" /></div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            {Object.entries(groups).map(([resource, perms]) => {
              const allOn = perms.every((p) => checked.has(p.name));
              const someOn = perms.some((p) => checked.has(p.name));
              return (
                <div
                  key={resource}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Resource header */}
                  <div
                    style={{
                      padding: '10px 16px',
                      background: 'var(--surface)',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleResource(perms)}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={allOn}
                      ref={(el) => { if (el) el.indeterminate = !allOn && someOn; }}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 15, height: 15 }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                      {resource.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
                      {perms.filter((p) => checked.has(p.name)).length} / {perms.length}
                    </span>
                  </div>

                  {/* Permission rows */}
                  <div>
                    {perms.map((p) => (
                      <label
                        key={p.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '9px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                          background: checked.has(p.name) ? 'rgba(200,240,74,.04)' : 'transparent',
                          transition: 'background .1s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked.has(p.name)}
                          onChange={() => toggle(p.name)}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{p.name}</div>
                          {p.description && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{p.description}</div>
                          )}
                        </div>
                        {p.name.endsWith(':all') && (
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 4,
                            background: 'rgba(200,240,74,.12)', color: 'var(--accent)',
                            fontFamily: 'var(--mono)', letterSpacing: '.05em', flexShrink: 0,
                          }}>
                            cross-user
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {checked.size} / {allPermissions.length} {t('permissions.selected')}
            </span>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? <span className="spinner" /> : t('permissions.save_role')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
