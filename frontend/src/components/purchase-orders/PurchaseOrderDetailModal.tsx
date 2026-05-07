import { useState, useEffect } from 'react';
import Modal from '../Modal';
import { purchaseOrdersApi } from '../../api/purchase-orders';
import type { PurchaseOrderRead, PurchaseOrderStatus, ToastType } from '../../types';

const STATUS_FLOW: PurchaseOrderStatus[] = ['pending', 'sent', 'received'];

const STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  pending:  'badge-operator',
  sent:     'badge-admin',
  received: 'badge-delivered',
};

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  pending:  'Pending',
  sent:     'Sent',
  received: 'Received',
};

const NEXT_ACTION: Record<PurchaseOrderStatus, string | null> = {
  pending:  'Mark as sent',
  sent:     'Mark as received',
  received: null,
};

interface Props {
  poId: string;
  onClose: () => void;
  onUpdated: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function PurchaseOrderDetailModal({ poId, onClose, onUpdated, toast }: Props) {
  const [po, setPo] = useState<PurchaseOrderRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    purchaseOrdersApi.get(poId).then(setPo).catch(() => {
      toast('Failed to load purchase order', 'error');
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
      toast(`Purchase order marked as ${nextStatus}`);
      onUpdated();
    } catch (err: any) {
      toast(err.response?.data?.detail ?? 'Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Modal
      title="Purchase order"
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
                Created {new Date(po.created_at).toLocaleDateString()}
              </div>
              <span className={`badge ${STATUS_BADGE[po.status]}`}>
                <span className="dot" />{STATUS_LABEL[po.status]}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {po.pdf_path && (
                <a
                  href={po.pdf_path}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  ↓ PDF
                </a>
              )}
              {NEXT_ACTION[po.status] && (
                <button className="btn btn-primary btn-sm" onClick={advanceStatus} disabled={updating}>
                  {updating ? <span className="spinner" /> : NEXT_ACTION[po.status]}
                </button>
              )}
            </div>
          </div>

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr>
                {['Product', 'Unit', 'Qty', 'Unit price', 'Line total'].map((h) => (
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
            Total:{' '}
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
