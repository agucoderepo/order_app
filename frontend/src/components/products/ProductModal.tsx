import { useState, useEffect } from 'react';
import Modal from '../Modal';
import { productsApi } from '../../api/products';
import { providersApi } from '../../api/providers';
import type { Product, ProductCreate, ProductUpdate, Provider, ToastType } from '../../types';

const COMMON_UNITS = ['kg', 'g', 'unit', 'box', 'dozen', 'liter', 'pack', 'bag'];

interface Props {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function ProductModal({ product, onClose, onSaved, toast }: Props) {
  const editing = !!product?.id;
  const [form, setForm] = useState({
    name: product?.name ?? '',
    unit: product?.unit ?? '',
    price: product ? String(product.price) : '',
    provider_id: product?.provider.id ?? '',
  });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    providersApi.list().then((list) => {
      setProviders(list.filter((p) => p.is_active));
      setLoadingProviders(false);
    }).catch(() => {
      setLoadingProviders(false);
    });
  }, []);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const priceVal = parseFloat(form.price);
    if (isNaN(priceVal) || priceVal <= 0) {
      setError('Price must be a positive number');
      return;
    }
    if (!form.provider_id) {
      setError('Please select a provider');
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        const body: ProductUpdate = {
          name: form.name.trim(),
          unit: form.unit.trim(),
          price: priceVal,
          provider_id: form.provider_id,
        };
        await productsApi.update(product!.id, body);
        toast('Product updated');
      } else {
        const body: ProductCreate = {
          name: form.name.trim(),
          unit: form.unit.trim(),
          price: priceVal,
          provider_id: form.provider_id,
        };
        await productsApi.create(body);
        toast('Product created');
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={editing ? 'Edit product' : 'New product'} subtitle="Product details and pricing" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Whole milk 1L"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Unit</label>
            <input
              list="unit-suggestions"
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
              placeholder="kg, unit, box..."
              required
            />
            <datalist id="unit-suggestions">
              {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
            </datalist>
          </div>

          <div className="field">
            <label>Price</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div className="field">
          <label>Provider</label>
          {loadingProviders ? (
            <div style={{ padding: '8px 0' }}><span className="spinner" /></div>
          ) : (
            <select
              value={form.provider_id}
              onChange={(e) => set('provider_id', e.target.value)}
              required
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 12px',
                color: form.provider_id ? 'var(--text)' : 'var(--muted)',
                fontFamily: 'var(--sans)',
                fontSize: 13,
                width: '100%',
              }}
            >
              <option value="">Select a provider...</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading || loadingProviders}>
            {loading ? <span className="spinner" /> : editing ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
