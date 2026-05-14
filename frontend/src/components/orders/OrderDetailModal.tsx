import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import type { OrderRead, OrderStatus } from '../../types';

interface Props {
  order: OrderRead;
  onClose: () => void;
  onEdit: () => void;
}

const STATUS_BADGE: Record<OrderStatus, string> = {
  draft:     'badge-operator',
  confirmed: 'badge-admin',
  delivered: 'badge-delivered',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 110, flexShrink: 0, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '.06em', textTransform: 'uppercase', paddingTop: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, flex: 1 }}>{value}</div>
    </div>
  );
}

function orderTotal(order: OrderRead): string {
  const total = order.items.reduce((sum, item) => {
    const discountPct = parseFloat(item.discount ?? '0');
    return sum + parseFloat(item.unit_price) * parseFloat(item.quantity) * (1 - discountPct / 100);
  }, 0);
  return total.toFixed(2);
}

export default function OrderDetailModal({ order, onClose, onEdit }: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      title={order.client.name}
      subtitle={order.client.phone ?? order.order_date}
      onClose={onClose}
      width={580}
    >
      <div style={{ marginBottom: 20 }}>
        <Row label={t('orders.col_date')} value={
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{order.order_date}</span>
        } />
        <Row label={t('orders.col_status')} value={
          <span className={`badge ${STATUS_BADGE[order.status]}`}>
            <span className="dot" />{t(`status.${order.status}`)}
          </span>
        } />
        <Row label={t('orders.col_source')} value={
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{order.source}</span>
        } />
        {order.notes && (
          <Row label={t('orders.col_notes')} value={
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{order.notes}</span>
          } />
        )}
      </div>

      {/* Items table */}
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                t('orders.item_product'),
                t('orders.item_qty'),
                t('orders.item_price'),
                t('orders.item_discount'),
                t('orders.item_total'),
              ].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const discountPct = parseFloat(item.discount ?? '0');
              const lineTotal = parseFloat(item.unit_price) * parseFloat(item.quantity) * (1 - discountPct / 100);
              return (
                <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{item.product.unit}</div>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>{item.quantity}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>${Number(item.unit_price).toFixed(2)}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>
                    {discountPct > 0 ? `${discountPct}%` : '—'}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700 }}>${lineTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 14, borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 20 }}>
        {t('common.total')}:{' '}
        <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)' }}>
          ${orderTotal(order)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.close')}</button>
        <button className="btn btn-primary btn-sm" onClick={onEdit}>{t('common.edit')}</button>
      </div>
    </Modal>
  );
}

const thStyle = {
  textAlign: 'left',
  fontSize: 11,
  color: 'var(--muted)',
  fontFamily: 'var(--mono)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  padding: '8px 12px',
  whiteSpace: 'nowrap',
} as const;

const tdStyle = {
  padding: '10px 12px',
  fontSize: 13,
} as const;
