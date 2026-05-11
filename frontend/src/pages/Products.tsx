import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { productsApi } from '../api/products';
import ProductTable from '../components/products/ProductTable';
import ProductModal from '../components/products/ProductModal';
import ConfirmDeactivateProduct from '../components/products/ConfirmDeactivateProduct';
import type { Product, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

type Modal =
  | { mode: 'create' }
  | { mode: 'edit'; product: Product }
  | { mode: 'confirm'; product: Product }
  | null;

export default function Products({ toast }: Props) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await productsApi.list());
    } catch (e: any) {
      toast(e.response?.data?.detail ?? t('products.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => { load(); }, [load]);

  const providerNames = Array.from(new Set(products.map((p) => p.provider.name))).sort();

  const filtered = products.filter((p) => {
    if (!showInactive && !p.is_active) return false;
    if (filterProvider && p.provider.name !== filterProvider) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.unit.toLowerCase().includes(term) ||
      p.provider.name.toLowerCase().includes(term)
    );
  });

  const active = products.filter((p) => p.is_active).length;
  const inactive = products.length - active;

  const stats = [
    { label: t('products.stats_total'),    value: products.length, color: 'var(--accent)' },
    { label: t('products.stats_active'),   value: active,          color: 'var(--accent2)' },
    { label: t('products.stats_inactive'), value: inactive,        color: 'var(--danger)' },
  ];

  return (
    <>
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t('products.table_title')}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={searchRef}
              className="toolbar-search"
              style={{ width: 240 }}
              placeholder={t('products.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: filterProvider ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--sans)', fontSize: 13 }}
            >
              <option value="">{t('products.all_providers')}</option>
              {providerNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              {t('products.show_inactive')}
            </label>
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create' })}>
              {t('products.new_button')}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <ProductTable products={filtered} onEdit={(p) => setModal({ mode: 'edit', product: p })} onDeactivate={(p) => setModal({ mode: 'confirm', product: p })} />
        )}
      </div>

      {modal?.mode === 'create' && (
        <ProductModal toast={toast} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.mode === 'edit' && (
        <ProductModal product={modal.product} toast={toast} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.mode === 'confirm' && (
        <ConfirmDeactivateProduct product={modal.product} toast={toast} onClose={() => setModal(null)} onDeactivated={() => { setModal(null); load(); }} />
      )}
    </>
  );
}
