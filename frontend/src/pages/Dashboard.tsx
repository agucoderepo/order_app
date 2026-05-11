import { useState, useEffect } from 'react';
import type { User, OrderRead } from '../types';
import { ordersApi } from '../api/orders';

interface Props {
  user: User | null;
  setPage?: (p: string) => void;
}

function orderTotal(order: OrderRead): number {
  return order.items.reduce((sum, item) => {
    return sum + parseFloat(item.unit_price) * parseFloat(item.quantity) * (1 - parseFloat(item.discount) / 100);
  }, 0);
}

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px 22px',
};

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--mono)',
  color: 'var(--muted)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
};

const TH: React.CSSProperties = {
  padding: '10px 20px',
  textAlign: 'left',
  fontSize: 11,
  fontFamily: 'var(--mono)',
  color: 'var(--muted)',
  fontWeight: 600,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
};

export default function Dashboard({ user, setPage }: Props) {
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    ordersApi.list()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, []);

  const todayOrders    = orders.filter(o => o.order_date === today);
  const draftOrders    = orders.filter(o => o.status === 'draft');
  const draftToday     = todayOrders.filter(o => o.status === 'draft').length;
  const confirmedToday = todayOrders.filter(o => o.status === 'confirmed').length;
  const deliveredToday = todayOrders.filter(o => o.status === 'delivered').length;
  const todayRevenue   = todayOrders
    .filter(o => o.status !== 'draft')
    .reduce((sum, o) => sum + orderTotal(o), 0);

  /* ── Operator dashboard ── */
  if (user?.role === 'operator') {
    return (
      <div>
        {/* Stat cards */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div style={CARD}>
            <div style={LABEL}>Today's orders</div>
            <div style={{ fontSize: 36, fontWeight: 800 }}>
              {loadingOrders ? <span className="spinner" /> : todayOrders.length}
            </div>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 6 }}>{today}</div>
          </div>

          <div style={CARD}>
            <div style={LABEL}>Pending (draft)</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: draftOrders.length > 0 ? 'var(--warning)' : 'var(--accent)' }}>
              {loadingOrders ? <span className="spinner" /> : draftOrders.length}
            </div>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 6 }}>
              {draftOrders.length === 1 ? 'order needs confirmation' : 'orders need confirmation'}
            </div>
          </div>

          <div style={CARD}>
            <div style={LABEL}>Confirmed today</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)' }}>
              {loadingOrders ? <span className="spinner" /> : confirmedToday}
            </div>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 6 }}>
              {confirmedToday > 0 ? `$${todayRevenue.toFixed(2)} total value` : 'none yet today'}
            </div>
          </div>
        </div>

        {/* Pending actions */}
        <div style={{ ...CARD, padding: 0, marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Pending actions</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                Draft orders awaiting confirmation
              </div>
            </div>
            {setPage && (
              <button className="btn btn-ghost btn-sm" onClick={() => setPage('orders')}>
                All orders →
              </button>
            )}
          </div>

          {loadingOrders ? (
            <div style={{ padding: 24, textAlign: 'center' }}><span className="spinner" /></div>
          ) : draftOrders.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>
              No pending orders — all caught up
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={TH}>Client</th>
                  <th style={TH}>Date</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Items</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {draftOrders.slice(0, 10).map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>
                      {order.client.name}
                      {order.client.phone && (
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginLeft: 8 }}>
                          {order.client.phone}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                      {order.order_date}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontFamily: 'var(--mono)', textAlign: 'right' }}>
                      {order.items.length}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600 }}>
                      ${orderTotal(order).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {draftOrders.length > 10 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '10px 20px', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', textAlign: 'center' }}>
                      +{draftOrders.length - 10} more — view all in Orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Today's breakdown */}
        {!loadingOrders && todayOrders.length > 0 && (
          <div style={{ ...CARD, padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Today's breakdown</div>
            </div>
            <div className="breakdown-grid">
              {[
                { label: 'Draft',     count: draftToday,     color: 'var(--warning)' },
                { label: 'Confirmed', count: confirmedToday, color: 'var(--accent)'  },
                { label: 'Delivered', count: deliveredToday, color: 'var(--accent2)' },
              ].map((s, i) => (
                <div key={s.label} style={{
                  padding: '20px 24px',
                  borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={LABEL}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Admin dashboard ── */
  return (
    <div>
      {/* Info cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div style={CARD}>
          <div style={LABEL}>Signed in as</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{user?.name ?? '—'}</div>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 4 }}>{user?.email}</div>
        </div>

        <div style={CARD}>
          <div style={LABEL}>Role</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{user?.role}</div>
        </div>

        <div style={CARD}>
          <div style={LABEL}>Status</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent2)' }}>active</div>
        </div>
      </div>

      {/* Today's orders overview */}
      <div style={{ ...CARD, padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Today's orders</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>{today}</div>
        </div>
        <div className="breakdown-grid-4">
          {[
            { label: 'Total',     value: loadingOrders ? '…' : String(todayOrders.length),    color: 'var(--text)'    },
            { label: 'Draft',     value: loadingOrders ? '…' : String(draftToday),            color: 'var(--warning)' },
            { label: 'Confirmed', value: loadingOrders ? '…' : String(confirmedToday),        color: 'var(--accent)'  },
            { label: 'Delivered', value: loadingOrders ? '…' : String(deliveredToday),        color: 'var(--accent2)' },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: '20px 24px',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={LABEL}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
