import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [adjQty, setAdjQty] = useState(item.adjusted_quantity ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const parsedQty = adjQty !== '' ? parseFloat(String(adjQty)) : null;
    if (parsedQty !== null && (isNaN(parsedQty) || parsedQty <= 0)) {
      setError(t('shopping_lists.adjusted_qty_positive'));
      return;
    }
    setLoading(true);
    try {
      const updated = await shoppingListsApi.adjustItem(listDate, item.id, {
        adjusted_quantity: parsedQty,
        notes: notes.trim() || null,
      });
      toast(t('shopping_lists.toast_adjusted'));
      onSaved(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  }

  function clearAdjustment() {
    setAdjQty('');
  }

  return (
    <Modal title={t('shopping_lists.adjust_title')} subtitle={item.product.name} onClose={onClose} width={400}>
      <form onSubmit={submit}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
          <div style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            {t('shopping_lists.system_qty_label')}
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
            {t('shopping_lists.adjusted_qty_label')}
            <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
              {t('shopping_lists.blank_hint')}
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
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAdjustment} title={t('shopping_lists.reset_title')}>
                {t('common.reset')}
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label>{t('common.notes')}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('shopping_lists.notes_placeholder')}
            rows={2}
            style={{ resize: 'vertical' }}
          />
        </div>

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? <span className="spinner" /> : t('shopping_lists.save_adjustment')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
