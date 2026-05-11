import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { shoppingListsApi } from '../api/shopping-lists';
import ShoppingListView from '../components/shopping-lists/ShoppingListView';
import type { ShoppingListRead, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ShoppingLists({ toast }: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayIso());
  const [list, setList] = useState<ShoppingListRead | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aggregating, setAggregating] = useState(false);

  const loadList = useCallback(async (d: string) => {
    setLoading(true);
    setList(null);
    setNotFound(false);
    try {
      setList(await shoppingListsApi.get(d));
    } catch (err: any) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        toast(err.response?.data?.detail ?? t('shopping_lists.load_error'), 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  function handleDateChange(d: string) {
    setDate(d);
    setList(null);
    setNotFound(false);
  }

  async function handleAggregate() {
    setAggregating(true);
    try {
      setList(await shoppingListsApi.aggregate(date));
      setNotFound(false);
      toast(t('shopping_lists.toast_aggregated'));
    } catch (err: any) {
      toast(err.response?.data?.detail ?? t('shopping_lists.aggregate_error'), 'error');
    } finally {
      setAggregating(false);
    }
  }

  return (
    <>
      {/* Date selector card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{t('shopping_lists.list_date')}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          style={{ fontSize: 13, padding: '7px 10px' }}
        />
        <button className="btn btn-ghost btn-sm" onClick={() => loadList(date)} disabled={loading}>
          {loading ? <span className="spinner" /> : t('common.load')}
        </button>

        {list && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleAggregate}
            disabled={aggregating || list.status === 'finalized'}
            title={t('shopping_lists.re_aggregate')}
          >
            {aggregating ? <span className="spinner" /> : t('shopping_lists.re_aggregate')}
          </button>
        )}
      </div>

      {/* Empty state — no list yet */}
      {!loading && notFound && !list && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
            {t('shopping_lists.not_found_title', { date })}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
            {t('shopping_lists.not_found_desc')}
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAggregate} disabled={aggregating}>
            {aggregating ? <span className="spinner" /> : t('shopping_lists.aggregate_button')}
          </button>
        </div>
      )}

      {/* Initial prompt — nothing loaded yet */}
      {!loading && !notFound && !list && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>{t('shopping_lists.initial_prompt')}</div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: '48px 0', textAlign: 'center' }}><span className="spinner" /></div>
      )}

      {/* Shopping list */}
      {list && (
        <ShoppingListView list={list} onUpdated={setList} toast={toast} />
      )}
    </>
  );
}
