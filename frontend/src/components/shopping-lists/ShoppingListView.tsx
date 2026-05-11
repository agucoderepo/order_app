import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { shoppingListsApi } from '../../api/shopping-lists';
import AdjustItemModal from './AdjustItemModal';
import type { ShoppingListRead, ShoppingListItemRead, ToastType } from '../../types';

interface Props {
  list: ShoppingListRead;
  onUpdated: (updated: ShoppingListRead) => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function ShoppingListView({ list, onUpdated, toast }: Props) {
  const { t } = useTranslation();
  const [adjustingItem, setAdjustingItem] = useState<ShoppingListItemRead | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);

  const isFinalized = list.status === 'finalized';
  const grandTotal = list.by_provider.reduce((sum, g) => sum + parseFloat(g.subtotal), 0);

  async function handleReopen() {
    if (!confirm(t('shopping_lists.confirm_reopen'))) return;
    setReopening(true);
    try {
      onUpdated(await shoppingListsApi.reopen(list.list_date));
      toast(t('shopping_lists.toast_reopened'));
    } catch (err: any) {
      toast(err.response?.data?.detail ?? t('shopping_lists.reopen_error'), 'error');
    } finally {
      setReopening(false);
    }
  }

  async function handleFinalize() {
    if (!confirm(t('shopping_lists.confirm_finalize'))) return;
    setFinalizing(true);
    try {
      onUpdated(await shoppingListsApi.finalize(list.list_date));
      toast(t('shopping_lists.toast_finalized'));
    } catch (err: any) {
      toast(err.response?.data?.detail ?? t('shopping_lists.finalize_error'), 'error');
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`badge ${isFinalized ? 'badge-admin' : 'badge-operator'}`}>
            <span className="dot" />
            {t(`status.${list.status}`)}
          </span>
          {isFinalized && list.finalized_at && (
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {t('shopping_lists.finalized_at', { datetime: new Date(list.finalized_at).toLocaleString() })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 16, color: 'var(--accent)' }}>
            {t('shopping_lists.grand_total')} ${grandTotal.toFixed(2)}
          </span>
          {!isFinalized && (
            <button className="btn btn-primary btn-sm" onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? <span className="spinner" /> : t('shopping_lists.finalize_button')}
            </button>
          )}
          {isFinalized && (
            <button className="btn btn-ghost btn-sm" onClick={handleReopen} disabled={reopening}>
              {reopening ? <span className="spinner" /> : t('shopping_lists.reopen_button')}
            </button>
          )}
        </div>
      </div>

      {list.by_provider.length === 0 && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          {t('shopping_lists.empty_orders')}
        </div>
      )}

      {/* Provider groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {list.by_provider.map((group) => (
          <div
            key={group.provider.id}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}
          >
            {/* Provider header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(200,240,74,.04)' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{group.provider.name}</span>
                {group.provider.phone && (
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginLeft: 10 }}>
                    {group.provider.phone}
                  </span>
                )}
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>
                ${parseFloat(group.subtotal).toFixed(2)}
              </span>
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[
                    t('shopping_lists.col_product'),
                    t('shopping_lists.col_unit'),
                    t('shopping_lists.col_unit_price'),
                    t('shopping_lists.col_system_qty'),
                    t('shopping_lists.col_adjusted_qty'),
                    t('shopping_lists.col_final_qty'),
                    t('shopping_lists.col_line_total'),
                    t('shopping_lists.col_notes'),
                    ...(isFinalized ? [] : ['']),
                  ].map((h, i) => (
                    <th key={i} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const hasAdjustment = item.adjusted_quantity !== null;
                  const unitPrice = Number(item.product.price);
                  const lineTotal = parseFloat(item.final_quantity) * unitPrice;
                  return (
                    <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600 }}>{item.product.name}</span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                        {item.product.unit}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                        ${unitPrice.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>
                        {item.total_quantity}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>
                        {hasAdjustment ? (
                          <span style={{ color: 'var(--accent2)', fontWeight: 700 }}>
                            {item.adjusted_quantity}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                        {item.final_quantity}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>
                        ${lineTotal.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--muted)', maxWidth: 180 }}>
                        {item.notes || '—'}
                      </td>
                      {!isFinalized && (
                        <td style={tdStyle}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setAdjustingItem(item)}>
                            {t('shopping_lists.adjust_button')}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {adjustingItem && (
        <AdjustItemModal
          listDate={list.list_date}
          item={adjustingItem}
          toast={toast}
          onClose={() => setAdjustingItem(null)}
          onSaved={(updated) => { setAdjustingItem(null); onUpdated(updated); }}
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
  padding: '10px 16px',
} as const;

const tdStyle = {
  padding: '12px 16px',
  fontSize: 13,
} as const;
