import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { purchaseOrdersApi } from '../../api/purchase-orders';
import type { PurchaseOrderRead, PurchaseOrderStatus, ToastType } from '../../types';

const STATUS_FLOW: PurchaseOrderStatus[] = ['pending', 'sent', 'received'];

const STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  pending:  'badge-operator',
  sent:     'badge-admin',
  received: 'badge-delivered',
};

interface Props {
  poId: string;
  onClose: () => void;
  onUpdated: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function PurchaseOrderDetailModal({ poId, onClose, onUpdated, toast }: Props) {
  const { t } = useTranslation();
  const [po, setPo] = useState<PurchaseOrderRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    purchaseOrdersApi.get(poId).then(setPo).catch(() => {
      toast(t('purchase_orders.load_error_detail'), 'error');
      onClose();
    }).finally(() => setLoading(false));
  }, [poId]);

  async function advanceStatus() {
    if (!po) return;
    const nextIdx = STATUS_FLOW.indexOf(po.status) + 1;
    if (nextIdx >= STATUS_FLOW.length) return;
    const nextStatus = STATUS_FLOW[nextIdx];
    setUpdating(true);
    try {
      const updated = await purchaseOrdersApi.update(po.id, { status: nextStatus });
      setPo(updated);
      toast(t('purchase_orders.toast_marked_as', { status: t(`status.${nextStatus}`) }));
      onUpdated();
    } catch (err: any) {
      toast(err.response?.data?.detail ?? t('purchase_orders.update_status_error'), 'error');
    } finally {
      setUpdating(false);
    }
  }

  function getNextActionLabel(status: PurchaseOrderStatus): string | null {
    if (status === 'pending') return t('purchase_orders.mark_as_sent');
    if (status === 'sent') return t('purchase_orders.mark_as_received');
    return null;
  }

  return (
    <Modal
      title={t('purchase_orders.modal_title')}
      subtitle={po ? `${po.provider.name} · ${po.provider.phone ?? ''}` : ''}
      onClose={onClose}
      width={620}
    >
      {loading || !po ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}><span className="spinner" /></div>
      ) : (
        <>
          {/* Header info row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                {t('purchase_orders.created_on', { date: new Date(po.created_at).toLocaleDateString() })}
              </div>
              <span className={`badge ${STATUS_BADGE[po.status]}`}>
                <span className="dot" />{t(`status.${po.status}`)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <a
                href={`/api/purchase-orders/${po.id}/print?token=${localStorage.getItem('access_token') ?? ''}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                title={t('purchase_orders.print_for_provider')}
              >
                {t('purchase_orders.print_for_provider')}
              </a>
              <a
                href={`/api/purchase-orders/${po.id}/print-breakdown?token=${localStorage.getItem('access_token') ?? ''}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                title={t('purchase_orders.print_with_breakdown')}
              >
                {t('purchase_orders.print_with_breakdown')}
              </a>
              {getNextActionLabel(po.status) && (
                <button className="btn btn-primary btn-sm" onClick={advanceStatus} disabled={updating}>
                  {updating ? <span className="spinner" /> : getNextActionLabel(po.status)}
                </button>
              )}
            </div>
          </div>

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr>
                {[
                  t('purchase_orders.col_product'),
                  t('purchase_orders.col_unit'),
                  t('purchase_orders.col_qty'),
                  t('purchase_orders.col_unit_price'),
                  t('purchase_orders.col_line_total'),
                ].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={tdStyle}><span style={{ fontWeight: 600 }}>{item.product.name}</span></td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{item.product.unit}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>{item.quantity}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>${Number(item.unit_price).toFixed(2)}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700 }}>${Number(item.line_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            {t('common.total')}:{' '}
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)' }}>
              ${Number(po.total_amount).toFixed(2)}
            </span>
          </div>
        </>
      )}
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
  padding: '10px 14px',
} as const;

const tdStyle = {
  padding: '11px 14px',
  fontSize: 13,
} as const;
