import type { OrderRead, OrderStatus } from '../../types';

interface Props {
  orders: OrderRead[];
  onEdit: (order: OrderRead) => void;
}

const STATUS_BADGE: Record<OrderStatus, string> = {
  draft:     'badge-operator',
  confirmed: 'badge-admin',
  delivered: 'badge-delivered',
};

/** Line total = unit_price × qty × (1 − discount% / 100) */
function orderTotal(order: OrderRead): string {
  const total = order.items.reduce((sum, item) => {
    const discountPct = parseFloat(item.discount ?? '0');
    return sum + parseFloat(item.unit_price) * parseFloat(item.quantity) * (1 - discountPct / 100);
  }, 0);
  return total.toFixed(2);
}

export default function OrderTable({ orders, onEdit }: Props) {
  if (!orders.length) {
    return <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>No orders found.</div>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={headerCellStyle}>Date</th>
          <th style={headerCellStyle}>Client</th>
          <th style={headerCellStyle}>Items</th>
          <th style={headerCellStyle}>Total</th>
          <th style={headerCellStyle}>Status</th>
          <th style={headerCellStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ ...cellStyle, fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
              {o.order_date}
            </td>
            <td style={cellStyle}>
              <div style={{ fontWeight: 700 }}>{o.client.name}</div>
              {o.client.phone && (
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                  {o.client.phone}
                </div>
              )}
            </td>
            <td style={{ ...cellStyle, fontFamily: 'var(--mono)' }}>{o.items.length}</td>
            <td style={{ ...cellStyle, fontFamily: 'var(--mono)', fontWeight: 700 }}>
              ${orderTotal(o)}
            </td>
            <td style={cellStyle}>
              <span className={`badge ${STATUS_BADGE[o.status]}`}>
                <span className="dot" />
                {o.status}
              </span>
            </td>
            <td style={cellStyle}>
              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(o)}>Edit</button>
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
