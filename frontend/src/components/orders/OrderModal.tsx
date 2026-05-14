import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import ClientCombobox from './ClientCombobox';
import ProductTypeahead from './ProductTypeahead';
import { ordersApi } from '../../api/orders';
import { clientsApi } from '../../api/clients';
import { productsApi } from '../../api/products';
import type { OrderRead, OrderCreate, OrderUpdate, OrderStatus, Client, Product, ToastType } from '../../types';

const STATUS_FLOW: OrderStatus[] = ['draft', 'confirmed', 'delivered'];

interface ItemRow {
  product_id: string;
  quantity:   string;
  discount:   string;
}

interface Props {
  order?:   OrderRead;
  onClose:  () => void;
  onSaved:  () => void;
  toast:    (msg: string, type?: ToastType) => void;
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

function lineTotal(price: number, qty: number, disc: number) {
  return price * qty * (1 - disc / 100);
}

export default function OrderModal({ order, onClose, onSaved, toast }: Props) {
  const { t } = useTranslation();
  const editing = !!order?.id;

  const [clients,     setClients]     = useState<Client[]>([]);
  const [products,    setProducts]    = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [clientId,  setClientId]  = useState(order?.client_id  ?? '');
  const [orderDate, setOrderDate] = useState(order?.order_date ?? todayIso());
  const [status,    setStatus]    = useState<OrderStatus>(order?.status ?? 'draft');
  const [notes,     setNotes]     = useState(order?.notes ?? '');
  const [items,     setItems]     = useState<ItemRow[]>(
    order?.items.map((i) => ({
      product_id: i.product_id,
      quantity:   String(i.quantity),
      discount:   String(i.discount ?? '0'),
    })) ?? [{ product_id: '', quantity: '', discount: '0' }],
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    Promise.all([clientsApi.list(), productsApi.list()])
      .then(([c, p]) => {
        setClients(c.filter((x) => x.is_active));
        setProducts(p.filter((x) => x.is_active));
        setLoadingData(false);
      })
      .catch(() => setLoadingData(false));
  }, []);

  const addItem    = () => setItems((p) => [...p, { product_id: '', quantity: '', discount: '0' }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, j) => j !== i));
  const setItem    = (i: number, f: keyof ItemRow, v: string) =>
    setItems((p) => p.map((r, j) => (j === i ? { ...r, [f]: v } : r)));

  function validate(): string | null {
    if (!clientId) return t('orders.validation_select_client');
    if (!items.length) return t('orders.validation_add_item');
    for (let i = 0; i < items.length; i++) {
      if (!items[i].product_id) return t('orders.validation_select_product', { row: i + 1 });
      const qty = parseFloat(items[i].quantity);
      if (isNaN(qty) || qty <= 0) return t('orders.validation_qty', { row: i + 1 });
      const disc = parseFloat(items[i].discount);
      if (isNaN(disc) || disc < 0 || disc > 100) return t('orders.validation_discount', { row: i + 1 });
    }
    const ids = items.map((r) => r.product_id);
    if (new Set(ids).size !== ids.length) return t('orders.validation_duplicate');
    return null;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const orderItems = items.map((r) => ({
        product_id: r.product_id,
        quantity:   parseFloat(r.quantity),
        discount:   parseFloat(r.discount) || 0,
      }));
      if (editing) {
        await ordersApi.update(order!.id, {
          status,
          notes: notes.trim() || null,
          items: orderItems,
        } as OrderUpdate);
        toast(t('orders.toast_updated'));
      } else {
        const body: OrderCreate = {
          client_id:  clientId,
          order_date: orderDate,
          items:      orderItems,
          source:     'manual',
          notes:      notes.trim() || null,
        };
        await ordersApi.create(body);
        toast(t('orders.toast_created'));
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  }

  const allowedStatuses = editing
    ? STATUS_FLOW.slice(STATUS_FLOW.indexOf(order!.status))
    : STATUS_FLOW;

  const productMap = new Map(products.map((p) => [p.id, p]));

  const itemUnitPriceMap = editing
    ? new Map(order!.items.map((i) => [i.product_id, parseFloat(i.unit_price)]))
    : new Map<string, number>();

  function getUnitPrice(pid: string) {
    if (editing && itemUnitPriceMap.has(pid)) return itemUnitPriceMap.get(pid)!;
    const p = productMap.get(pid);
    return p ? Number(p.price) : 0;
  }

  const grandTotal = items.reduce((sum, r) => {
    const up  = getUnitPrice(r.product_id);
    const qty = parseFloat(r.quantity);
    const disc = parseFloat(r.discount) || 0;
    if (!r.product_id || isNaN(qty)) return sum;
    return sum + lineTotal(up, qty, disc);
  }, 0);

  return (
    <Modal
      title={editing ? t('orders.modal_title_edit') : t('orders.modal_title_new')}
      subtitle={editing ? `#${order!.id.slice(0, 8)} · ${order!.client.name}` : t('orders.modal_sub_new')}
      onClose={onClose}
      width={700}
    >
      <form onSubmit={submit}>
        {loadingData ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {!editing && (
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>{t('orders.field_client')}</label>
                  <ClientCombobox
                    clients={clients}
                    value={clientId}
                    onChange={setClientId}
                    onClientCreated={(c) => setClients((prev) => [...prev, c])}
                    toast={toast}
                  />
                </div>
              )}

              <div className="field">
                <label>{t('orders.field_date')}</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  required
                  disabled={editing}
                  style={editing ? { opacity: 0.5 } : undefined}
                />
              </div>

              {editing && (
                <div className="field">
                  <label>{t('orders.field_status')}</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} style={selectStyle}>
                    {allowedStatuses.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                  {t('orders.field_items')}
                </label>
                <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>{t('orders.add_item')}</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 28px', gap: 6, marginBottom: 4 }}>
                {[t('orders.col_product'), t('orders.col_qty'), t('orders.col_disc'), t('orders.col_subtotal'), ''].map((h) => (
                  <div key={h} style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((row, idx) => {
                  const prod  = productMap.get(row.product_id);
                  const up    = getUnitPrice(row.product_id);
                  const qty   = parseFloat(row.quantity);
                  const disc  = parseFloat(row.discount) || 0;
                  const total = row.product_id && !isNaN(qty) ? lineTotal(up, qty, disc) : null;

                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 28px', gap: 6, alignItems: 'center' }}>
                      <ProductTypeahead products={products} value={row.product_id} onChange={(id) => setItem(idx, 'product_id', id)} />

                      <div style={{ position: 'relative' }}>
                        <input
                          type="number" step="0.001" min="0.001"
                          value={row.quantity}
                          onChange={(e) => setItem(idx, 'quantity', e.target.value)}
                          placeholder="0"
                          style={{ paddingRight: prod ? 28 : 10 }}
                        />
                        {prod && (
                          <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', pointerEvents: 'none' }}>
                            {prod.unit}
                          </span>
                        )}
                      </div>

                      <div style={{ position: 'relative' }}>
                        <input
                          type="number" step="0.01" min="0" max="100"
                          value={row.discount}
                          onChange={(e) => setItem(idx, 'discount', e.target.value)}
                          placeholder="0"
                          style={{ paddingRight: 18 }}
                        />
                        <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', pointerEvents: 'none' }}>%</span>
                      </div>

                      <div style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, color: total !== null ? 'var(--text)' : 'var(--muted)', textAlign: 'right' }}>
                        {total !== null ? `$${total.toFixed(2)}` : '—'}
                      </div>

                      <button
                        type="button" className="btn btn-danger btn-sm"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        style={{ padding: '4px 7px', fontSize: 12 }}
                      >✕</button>
                    </div>
                  );
                })}
              </div>

              {grandTotal > 0 && (
                <div style={{ textAlign: 'right', fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 10, paddingRight: 34 }}>
                  {t('common.total')}: <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 15 }}>${grandTotal.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="field">
              <label>{t('orders.field_notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('orders.notes_placeholder')}
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>
          </>
        )}

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading || loadingData}>
            {loading ? <span className="spinner" /> : editing ? t('orders.save_button') : t('orders.create_button')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 10px', color: 'var(--text)', fontFamily: 'var(--sans)',
  fontSize: 13, width: '100%',
};
