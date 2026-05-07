import type { Product } from '../../types';

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDeactivate: (product: Product) => void;
}

export default function ProductTable({ products, onEdit, onDeactivate }: Props) {
  if (!products.length) {
    return <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>No products found.</div>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={headerCellStyle}>Name</th>
          <th style={headerCellStyle}>Provider</th>
          <th style={headerCellStyle}>Unit</th>
          <th style={headerCellStyle}>Price</th>
          <th style={headerCellStyle}>Status</th>
          <th style={headerCellStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={cellStyle}>
              <div style={{ fontWeight: 700 }}>{p.name}</div>
            </td>
            <td style={cellStyle}>{p.provider.name}</td>
            <td style={{ ...cellStyle, fontFamily: 'var(--mono)', fontSize: 12 }}>{p.unit}</td>
            <td style={{ ...cellStyle, fontFamily: 'var(--mono)' }}>
              ${Number(p.price).toFixed(2)}
            </td>
            <td style={cellStyle}>
              <span className={`badge ${p.is_active ? 'badge-admin' : 'badge-operator'}`}>
                <span className="dot" />
                {p.is_active ? 'active' : 'inactive'}
              </span>
            </td>
            <td style={cellStyle}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(p)}>Edit</button>
                {p.is_active && (
                  <button className="btn btn-danger btn-sm" onClick={() => onDeactivate(p)}>Deactivate</button>
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
