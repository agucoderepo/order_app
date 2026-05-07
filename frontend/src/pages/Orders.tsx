import { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '../api/orders';
import OrderTable from '../components/orders/OrderTable';
import OrderModal from '../components/orders/OrderModal';
import type { OrderRead, OrderStatus, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

type Modal =
  | { mode: 'create' }
  | { mode: 'edit'; order: OrderRead }
  | null;

const STATUS_FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Delivered', value: 'delivered' },
];

export default function Orders({ toast }: Props) {
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await ordersApi.list());
    } catch (e: any) {
      toast(e.response?.data?.detail ?? 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return o.client.name.toLowerCase().includes(term) || (o.client.phone ?? '').includes(term);
  });

  const counts = {
    all: orders.length,
    draft: orders.filter((o) => o.status === 'draft').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total orders', value: counts.all,      color: 'var(--accent)' },
          { label: 'Draft',        value: counts.draft,     color: 'var(--muted)' },
          { label: 'Confirmed',    value: counts.confirmed, color: 'var(--accent2)' },
          { label: 'Delivered',    value: counts.delivered, color: 'var(--accent)' },
        ].map((s) => (
          <div
            key={s.label}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}
          >
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {/* Status tabs */}
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

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 12px',
                color: 'var(--text)',
                fontFamily: 'var(--sans)',
                fontSize: 13,
                outline: 'none',
                width: 220,
              }}
              placeholder="Search by client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create' })}>
              + New order
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <OrderTable
            orders={filtered}
            onEdit={(order) => setModal({ mode: 'edit', order })}
          />
        )}
      </div>

      {modal?.mode === 'create' && (
        <OrderModal
          toast={toast}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
      {modal?.mode === 'edit' && (
        <OrderModal
          order={modal.order}
          toast={toast}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}
