import type { Client } from '../../types';

interface Props {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDeactivate: (client: Client) => void;
}

export default function ClientTable({ clients, onEdit, onDeactivate }: Props) {
  if (!clients.length) {
    return <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>No clients found.</div>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={headerCellStyle}>Name</th>
          <th style={headerCellStyle}>Address</th>
          <th style={headerCellStyle}>Phone</th>
          <th style={headerCellStyle}>Status</th>
          <th style={headerCellStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {clients.map((c) => (
          <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={cellStyle}>
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              {c.notes && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{c.notes}</div>}
            </td>
            <td style={cellStyle}>{c.address || '—'}</td>
            <td style={cellStyle}>{c.phone || '—'}</td>
            <td style={cellStyle}>
              <span className={`badge ${c.is_active ? 'badge-admin' : 'badge-operator'}`}>
                <span className="dot" />
                {c.is_active ? 'active' : 'inactive'}
              </span>
            </td>
            <td style={cellStyle}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(c)}>Edit</button>
                {c.is_active && (
                  <button className="btn btn-danger btn-sm" onClick={() => onDeactivate(c)}>Deactivate</button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const headerCellStyle = {
  textAlign: 'left',
  fontSize: 11,
  color: 'var(--muted)',
  fontFamily: 'var(--mono)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  padding: '12px 20px',
} as const;

const cellStyle = {
  padding: '14px 20px',
  fontSize: 13,
} as const;
