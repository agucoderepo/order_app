import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ordersApi } from '../api/orders';
import OrderTable from '../components/orders/OrderTable';
import OrderDetailModal from '../components/orders/OrderDetailModal';
import OrderModal from '../components/orders/OrderModal';
import type { OrderRead, OrderStatus, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

type Modal =
  | { mode: 'create' }
  | { mode: 'view'; order: OrderRead }
  | { mode: 'edit'; order: OrderRead }
  | null;

const STATUS_VALUES: (OrderStatus | 'all')[] = ['all', 'draft', 'confirmed', 'delivered'];

export default function Orders({ toast }: Props) {
  const { t } = useTranslation();
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
      toast(e.response?.data?.detail ?? t('orders.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

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

  const stats = [
    { label: t('orders.stats_total'),    value: counts.all,       color: 'var(--accent)' },
    { label: t('status.draft'),          value: counts.draft,     color: 'var(--muted)' },
    { label: t('status.confirmed'),      value: counts.confirmed, color: 'var(--accent2)' },
    { label: t('status.delivered'),      value: counts.delivered, color: 'var(--accent)' },
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

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="toolbar-search"
              style={{ width: 220 }}
              placeholder={t('orders.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create' })}>
              {t('orders.new_button')}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <OrderTable orders={filtered} onView={(order) => setModal({ mode: 'view', order })} onEdit={(order) => setModal({ mode: 'edit', order })} />
        )}
      </div>

      {modal?.mode === 'view' && (
        <OrderDetailModal
          order={modal.order}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ mode: 'edit', order: modal.order })}
        />
      )}
      {modal?.mode === 'create' && (
        <OrderModal toast={toast} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.mode === 'edit' && (
        <OrderModal order={modal.order} toast={toast} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
    </>
  );
}
