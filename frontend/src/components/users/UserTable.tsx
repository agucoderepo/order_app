import type { User } from '../../types';

interface Props {
  users: User[];
  currentUserId?: string;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
}

export default function UserTable({ users, currentUserId, onEdit, onDeactivate }: Props) {
  if (users.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No users found
      </div>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Name / Email', 'Role', 'Status', 'Created', 'Actions'].map((h) => (
            <th key={h} style={{
              textAlign: 'left', padding: '11px 20px',
              fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)',
              letterSpacing: '.1em', textTransform: 'uppercase',
              borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,.2)',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <td style={{ padding: '13px 20px', verticalAlign: 'middle' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {u.email}
              </div>
            </td>
            <td style={{ padding: '13px 20px', verticalAlign: 'middle' }}>
              <span className={`badge badge-${u.role}`}>
                <span className="dot" />{u.role}
              </span>
            </td>
            <td style={{ padding: '13px 20px', verticalAlign: 'middle' }}>
              <span className={`badge badge-${u.is_active ? 'active' : 'inactive'}`}>
                <span className="dot" />{u.is_active ? 'active' : 'inactive'}
              </span>
            </td>
            <td style={{ padding: '13px 20px', verticalAlign: 'middle', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
              {new Date(u.created_at).toLocaleDateString()}
            </td>
            <td style={{ padding: '13px 20px', verticalAlign: 'middle' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(u)}>
                  Edit
                </button>
                {u.id !== currentUserId && u.is_active && (
                  <button className="btn btn-danger btn-sm" onClick={() => onDeactivate(u)}>
                    Deactivate
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}