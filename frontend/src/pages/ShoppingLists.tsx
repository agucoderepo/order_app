import { useState, useCallback } from 'react';
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
        toast(err.response?.data?.detail ?? 'Failed to load shopping list', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      toast('Shopping list aggregated from confirmed orders');
    } catch (err: any) {
      toast(err.response?.data?.detail ?? 'Failed to aggregate', 'error');
    } finally {
      setAggregating(false);
    }
  }

  return (
    <>
      {/* Date selector card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>List date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          style={{ fontSize: 13, padding: '7px 10px' }}
        />
        <button className="btn btn-ghost btn-sm" onClick={() => loadList(date)} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Load'}
        </button>

        {list && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleAggregate}
            disabled={aggregating || list.status === 'finalized'}
            title="Re-aggregate confirmed orders for this date (replaces existing items)"
          >
            {aggregating ? <span className="spinner" /> : '↻ Re-aggregate'}
          </button>
        )}
      </div>

      {/* Empty state — no list yet */}
      {!loading && notFound && !list && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No shopping list for {date}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
            Aggregate confirmed orders for this date to generate a shopping list grouped by provider.
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAggregate} disabled={aggregating}>
            {aggregating ? <span className="spinner" /> : '+ Aggregate confirmed orders'}
          </button>
        </div>
      )}

      {/* Initial prompt — nothing loaded yet */}
      {!loading && !notFound && !list && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Select a date and click Load to view or create a shopping list.</div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: '48px 0', textAlign: 'center' }}><span className="spinner" /></div>
      )}

      {/* Shopping list */}
      {list && (
        <ShoppingListView
          list={list}
          onUpdated={setList}
          toast={toast}
        />
      )}
    </>
  );
}
