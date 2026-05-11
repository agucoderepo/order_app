import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { invoicesApi } from '../../api/invoices';
import type { InvoiceRead, InvoiceStatus, ToastType } from '../../types';

const STATUS_FLOW: InvoiceStatus[] = ['draft', 'sent', 'paid'];

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'badge-operator',
  sent:  'badge-admin',
  paid:  'badge-delivered',
};

interface Props {
  invoiceId: string;
  onClose: () => void;
  onUpdated: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function InvoiceDetailModal({ invoiceId, onClose, onUpdated, toast }: Props) {
  const { t } = useTranslation();
  const [inv, setInv] = useState<InvoiceRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    invoicesApi.get(invoiceId)
      .then(setInv)
      .catch(() => { toast(t('invoices.load_error_detail'), 'error'); onClose(); })
      .finally(() => setLoading(false));
  }, [invoiceId]);

  async function advanceStatus() {
    if (!inv) return;
    const nextIdx = STATUS_FLOW.indexOf(inv.status) + 1;
    if (nextIdx >= STATUS_FLOW.length) return;
    const nextStatus = STATUS_FLOW[nextIdx];
    setUpdating(true);
    try {
      const updated = await invoicesApi.update(inv.id, { status: nextStatus });
      setInv(updated);
      toast(t('invoices.toast_marked_as', { status: t(`status.${nextStatus}`) }));
      onUpdated();
    } catch (err: any) {
      toast(err.response?.data?.detail ?? t('invoices.update_status_error'), 'error');
    } finally {
      setUpdating(false);
    }
  }

  function getNextActionLabel(status: InvoiceStatus): string | null {
    if (status === 'draft') return t('invoices.mark_as_sent');
    if (status === 'sent') return t('invoices.mark_as_paid');
    return null;
  }

  function lineTotal(unitPrice: string, qty: string, discount: string): number {
    const up = Number(unitPrice);
    const q = Number(qty);
    const d = Number(discount);
    return up * q * (1 - d / 100);
  }

  return (
    <Modal
      title={inv ? inv.invoice_number : t('invoices.col_invoice_num')}
      subtitle={inv ? `${inv.client.name} · ${t('invoices.order_date_label', { date: inv.order_date })}` : ''}
      onClose={onClose}
      width={660}
    >
      {loading || !inv ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}><span className="spinner" /></div>
      ) : (
        <>
          {/* Header info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                {t('invoices.created_on', { date: new Date(inv.created_at).toLocaleDateString() })}
              </div>
              <span className={`badge ${STATUS_BADGE[inv.status]}`}>
                <span className="dot" />{t(`status.${inv.status}`)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <a
                href={`/api/invoices/${inv.id}/print?token=${localStorage.getItem('access_token') ?? ''}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
              >
                {t('invoices.print_pdf')}
              </a>
              {getNextActionLabel(inv.status) && (
                <button className="btn btn-primary btn-sm" onClick={advanceStatus} disabled={updating}>
                  {updating ? <span className="spinner" /> : getNextActionLabel(inv.status)}
                </button>
              )}
            </div>
          </div>

          {/* Line items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr>
                {[
                  t('invoices.col_product'),
                  t('invoices.col_unit'),
                  t('invoices.col_qty'),
                  t('invoices.col_unit_price'),
                  t('invoices.col_disc'),
                  t('invoices.col_line_total'),
                ].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={tdStyle}><span style={{ fontWeight: 600 }}>{item.product.name}</span></td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                    {item.product.unit}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>{item.quantity}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                    ${Number(item.unit_price).toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                    {Number(item.discount) > 0 ? `${Number(item.discount).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                    ${lineTotal(item.unit_price, item.quantity, item.discount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            {t('common.total')}:{' '}
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)' }}>
              ${Number(inv.total_amount).toFixed(2)}
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
