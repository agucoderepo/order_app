import { useState, useEffect, useCallback } from 'react';
import { invoicesApi } from '../api/invoices';
import InvoiceDetailModal from '../components/invoices/InvoiceDetailModal';
import type { InvoiceSummary, InvoiceStatus, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

type StatusFilter = InvoiceStatus | 'all';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All',   value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent',  value: 'sent' },
  { label: 'Paid',  value: 'paid' },
];

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'badge-operator',
  sent:  'badge-admin',
  paid:  'badge-delivered',
};

export default function Invoices({ toast }: Props) {
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
      toast(e.response?.data?.detail ?? 'Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

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

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total', value: counts.all,   color: 'var(--accent)' },
          { label: 'Draft', value: counts.draft,  color: 'var(--muted)' },
          { label: 'Sent',  value: counts.sent,   color: 'var(--accent2)' },
          { label: 'Paid',  value: counts.paid,   color: 'var(--accent)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={statusFilter === f.value ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                style={{ fontSize: 12 }}
              >
                {f.label}
                <span style={{ marginLeft: 6, opacity: 0.7, fontFamily: 'var(--mono)', fontSize: 11 }}>
                  {counts[f.value]}
                </span>
              </button>
            ))}
          </div>
          <input
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', width: 240 }}
            placeholder="Search invoice #, client or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>No invoices found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Invoice #', 'Client', 'Order date', 'Total', 'Status', 'PDF', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12 }}>
                    {inv.invoice_number}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>{inv.client.name}</span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {inv.order_date}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                    ${Number(inv.total_amount).toFixed(2)}
                  </td>
                  <td style={tdStyle}>
                    <span className={`badge ${STATUS_BADGE[inv.status]}`}>
                      <span className="dot" />{inv.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {inv.pdf_path ? (
                      <a href={inv.pdf_path} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                        ↓ PDF
                      </a>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDetailId(inv.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailId && (
        <InvoiceDetailModal
          invoiceId={detailId}
          toast={toast}
          onClose={() => setDetailId(null)}
          onUpdated={load}
        />
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
