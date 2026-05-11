import { useState, useEffect, useCallback } from 'react';
import { purchaseOrdersApi } from '../api/purchase-orders';
import PurchaseOrderDetailModal from '../components/purchase-orders/PurchaseOrderDetailModal';
import type { PurchaseOrderSummary, PurchaseOrderStatus, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

type StatusFilter = PurchaseOrderStatus | 'all';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All',      value: 'all' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Sent',     value: 'sent' },
  { label: 'Received', value: 'received' },
];

const STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  pending:  'badge-operator',
  sent:     'badge-admin',
  received: 'badge-delivered',
};

export default function PurchaseOrders({ toast }: Props) {
  const [pos, setPos] = useState<PurchaseOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPos(await purchaseOrdersApi.list());
    } catch (e: any) {
      toast(e.response?.data?.detail ?? 'Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = pos.filter((po) => {
    if (statusFilter !== 'all' && po.status !== statusFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      po.provider.name.toLowerCase().includes(term) ||
      po.list_date.includes(term)
    );
  });

  const counts: Record<StatusFilter, number> = {
    all:      pos.length,
    pending:  pos.filter((p) => p.status === 'pending').length,
    sent:     pos.filter((p) => p.status === 'sent').length,
    received: pos.filter((p) => p.status === 'received').length,
  };

  return (
    <>
      {/* Stats */}
      <div className="stat-grid-4">
        {[
          { label: 'Total',    value: counts.all,      color: 'var(--accent)' },
          { label: 'Pending',  value: counts.pending,  color: 'var(--muted)' },
          { label: 'Sent',     value: counts.sent,     color: 'var(--accent2)' },
          { label: 'Received', value: counts.received, color: 'var(--accent)' },
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
            className="toolbar-search"
            style={{ width: 220 }}
            placeholder="Search provider or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>No purchase orders found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Provider', 'Items value', 'Status', 'PDF', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((po) => (
                <tr key={po.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {po.list_date}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700 }}>{po.provider.name}</div>
                    {po.provider.phone && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>{po.provider.phone}</div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                    ${Number(po.total_amount).toFixed(2)}
                  </td>
                  <td style={tdStyle}>
                    <span className={`badge ${STATUS_BADGE[po.status]}`}>
                      <span className="dot" />{po.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {po.pdf_path ? (
                      <a href={po.pdf_path} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                        ↓ PDF
                      </a>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDetailId(po.id)}>
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
        <PurchaseOrderDetailModal
          poId={detailId}
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
