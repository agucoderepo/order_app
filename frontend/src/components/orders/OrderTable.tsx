import { useTranslation } from 'react-i18next';
import type { OrderRead, OrderStatus } from '../../types';

interface Props {
  orders: OrderRead[];
  onView: (order: OrderRead) => void;
  onEdit: (order: OrderRead) => void;
}

const STATUS_BADGE: Record<OrderStatus, string> = {
  draft:     'badge-operator',
  confirmed: 'badge-admin',
  delivered: 'badge-delivered',
};

function orderTotal(order: OrderRead): string {
  const total = order.items.reduce((sum, item) => {
    const discountPct = parseFloat(item.discount ?? '0');
    return sum + parseFloat(item.unit_price) * parseFloat(item.quantity) * (1 - discountPct / 100);
  }, 0);
  return total.toFixed(2);
}

export default function OrderTable({ orders, onView, onEdit }: Props) {
  const { t } = useTranslation();

  if (!orders.length) {
    return <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>{t('orders.empty')}</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={headerCellStyle}>{t('orders.col_date')}</th>
          <th style={headerCellStyle}>{t('orders.col_client')}</th>
          <th style={headerCellStyle}>{t('orders.col_items')}</th>
          <th style={headerCellStyle}>{t('orders.col_total')}</th>
          <th style={headerCellStyle}>{t('orders.col_status')}</th>
          <th style={headerCellStyle}>{t('orders.col_actions')}</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} className="tr-clickable" style={{ borderTop: '1px solid var(--border)' }} onClick={() => onView(o)}>
            <td style={{ ...cellStyle, fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{o.order_date}</td>
            <td style={cellStyle}>
              <div style={{ fontWeight: 700 }}>{o.client.name}</div>
              {o.client.phone && (
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                  {o.client.phone}
                </div>
              )}
            </td>
            <td style={{ ...cellStyle, fontFamily: 'var(--mono)' }}>{o.items.length}</td>
            <td style={{ ...cellStyle, fontFamily: 'var(--mono)', fontWeight: 700 }}>${orderTotal(o)}</td>
            <td style={cellStyle}>
              <span className={`badge ${STATUS_BADGE[o.status]}`}>
                <span className="dot" />
                {t(`status.${o.status}`)}
              </span>
            </td>
            <td style={cellStyle} onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(o)}>{t('common.edit')}</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
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
  whiteSpace: 'nowrap',
} as const;

const cellStyle = {
  padding: '14px 20px',
  fontSize: 13,
} as const;
