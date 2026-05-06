import { useState } from 'react';
import Modal from '../Modal';
import { shoppingListsApi } from '../../api/shopping-lists';
import type { ShoppingListItemRead, ShoppingListRead, ToastType } from '../../types';

interface Props {
  listDate: string;
  item: ShoppingListItemRead;
  onClose: () => void;
  onSaved: (updated: ShoppingListRead) => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function AdjustItemModal({ listDate, item, onClose, onSaved, toast }: Props) {
  const [adjQty, setAdjQty] = useState(item.adjusted_quantity ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const parsedQty = adjQty !== '' ? parseFloat(String(adjQty)) : null;
    if (parsedQty !== null && (isNaN(parsedQty) || parsedQty <= 0)) {
      setError('Adjusted quantity must be a positive number');
      return;
    }
    setLoading(true);
    try {
      const updated = await shoppingListsApi.adjustItem(listDate, item.id, {
        adjusted_quantity: parsedQty,
        notes: notes.trim() || null,
      });
      toast('Item adjusted');
      onSaved(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function clearAdjustment() {
    setAdjQty('');
  }

  return (
    <Modal title="Adjust item" subtitle={item.product.name} onClose={onClose} width={400}>
      <form onSubmit={submit}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
          <div style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            System-calculated quantity
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16 }}>
            {item.total_quantity}
          </span>
          <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 12 }}>
            {item.product.unit}
          </span>
        </div>

        <div className="field">
          <label>
            Adjusted quantity
            <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
              (leave blank to use system qty)
            </span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={adjQty}
              onChange={(e) => setAdjQty(e.target.value)}
              placeholder={item.total_quantity}
              style={{ flex: 1 }}
            />
            {adjQty !== '' && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAdjustment} title="Reset to system quantity">
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Round up to full box, buffer stock..."
            rows={2}
            style={{ resize: 'vertical' }}
          />
        </div>

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Save adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
