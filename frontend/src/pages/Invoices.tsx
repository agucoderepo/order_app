import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invoicesApi } from '../api/invoices';
import InvoiceDetailModal from '../components/invoices/InvoiceDetailModal';
import type { InvoiceSummary, InvoiceStatus, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

type StatusFilter = InvoiceStatus | 'all';

const STATUS_VALUES: StatusFilter[] = ['all', 'draft', 'sent', 'paid'];

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'badge-operator',
  sent:  'badge-admin',
  paid:  'badge-delivered',
};

export default function Invoices({ toast }: Props) {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInvoices(await invoicesApi.list());
    } catch (e: any) {
      toast(e.response?.data?.detail ?? t('invoices.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(term) ||
      inv.client.name.toLowerCase().includes(term) ||
      inv.order_date.includes(term)
    );
  });

  const counts: Record<StatusFilter, number> = {
    all:   invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    sent:  invoices.filter((i) => i.status === 'sent').length,
    paid:  invoices.filter((i) => i.status === 'paid').length,
  };

  const stats = [
    { label: t('invoices.stats_total'), value: counts.all,   color: 'var(--accent)' },
    { label: t('status.draft'),         value: counts.draft,  color: 'var(--muted)' },
    { label: t('status.sent'),          value: counts.sent,   color: 'var(--accent2)' },
    { label: t('status.paid'),          value: counts.paid,   color: 'var(--accent)' },
  ];

  return (
    <>
      <div className="stat-grid-4">
        {stats.map((s) => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_VALUES.map((v) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={statusFilter === v ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                style={{ fontSize: 12 }}
              >
                {v === 'all' ? t('common.all') : t(`status.${v}`)}
                <span style={{ marginLeft: 6, opacity: 0.7, fontFamily: 'var(--mono)', fontSize: 11 }}>
                  {counts[v]}
                </span>
              </button>
            ))}
          </div>
          <input
            className="toolbar-search"
            style={{ width: 240 }}
            placeholder={t('invoices.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>{t('invoices.empty')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[
                  t('invoices.col_invoice_num'),
                  t('invoices.col_client'),
                  t('invoices.col_order_date'),
                  t('invoices.col_total'),
                  t('invoices.col_status'),
                  t('invoices.col_pdf'),
                  '',
                ].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12 }}>{inv.invoice_number}</td>
                  <td style={tdStyle}><span style={{ fontWeight: 600 }}>{inv.client.name}</span></td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{inv.order_date}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700 }}>${Number(inv.total_amount).toFixed(2)}</td>
                  <td style={tdStyle}>
                    <span className={`badge ${STATUS_BADGE[inv.status]}`}>
                      <span className="dot" />{t(`status.${inv.status}`)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {inv.pdf_path ? (
                      <a href={inv.pdf_path} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">↓ PDF</a>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDetailId(inv.id)}>{t('common.view')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailId && (
        <InvoiceDetailModal invoiceId={detailId} toast={toast} onClose={() => setDetailId(null)} onUpdated={load} />
      )}
    </>
  );
}

const thStyle = {
  textAlign: 'left',
  fontSize: 11,
  color: 'var(--muted)',
  fontFamily: 'var(--mono)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  padding: '12px 20px',
} as const;

const tdStyle = {
  padding: '14px 20px',
  fontSize: 13,
} as const;
