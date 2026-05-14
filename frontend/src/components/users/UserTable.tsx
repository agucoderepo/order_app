import { useTranslation } from 'react-i18next';
import type { User } from '../../types';

interface Props {
  users: User[];
  currentUserId?: string;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
}

export default function UserTable({ users, currentUserId, onView, onEdit, onDeactivate }: Props) {
  const { t } = useTranslation();

  if (users.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        {t('users.empty')}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {[t('users.col_name_email'), t('users.col_role'), t('users.col_status'), t('users.col_created'), t('users.col_actions')].map((h) => (
            <th key={h} style={{
              textAlign: 'left', padding: '11px 20px',
              fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)',
              letterSpacing: '.1em', textTransform: 'uppercase',
              borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,.2)',
              whiteSpace: 'nowrap',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className="tr-clickable" style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }} onClick={() => onView(u)}>
            <td style={{ padding: '13px 20px', verticalAlign: 'middle' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{u.email}</div>
            </td>
            <td style={{ padding: '13px 20px', verticalAlign: 'middle' }}>
              <span className={`badge badge-${u.role}`}>
                <span className="dot" />{u.role}
              </span>
            </td>
            <td style={{ padding: '13px 20px', verticalAlign: 'middle' }}>
              <span className={`badge badge-${u.is_active ? 'active' : 'inactive'}`}>
                <span className="dot" />{u.is_active ? t('common.active') : t('common.inactive')}
              </span>
            </td>
            <td style={{ padding: '13px 20px', verticalAlign: 'middle', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
              {new Date(u.created_at).toLocaleDateString()}
            </td>
            <td style={{ padding: '13px 20px', verticalAlign: 'middle' }}>
              <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(u)}>{t('common.edit')}</button>
                {u.id !== currentUserId && u.is_active && (
                  <button className="btn btn-danger btn-sm" onClick={() => onDeactivate(u)}>{t('common.deactivate')}</button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
