import { useState, useRef, useEffect } from 'react';
import type { Product } from '../../types';

interface Props {
  products: Product[];
  value: string;           // selected product_id
  onChange: (id: string) => void;
  disabled?: boolean;
}

export default function ProductTypeahead({ products, value, onChange, disabled }: Props) {
  const selected = products.find((p) => p.id === value) ?? null;

  const [query, setQuery] = useState(selected ? `${selected.name} (${selected.unit})` : '');
  const [open, setOpen]   = useState(false);
  const wrapRef           = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = products.find((p) => p.id === value);
    setQuery(p ? `${p.name} (${p.unit})` : '');
  }, [value, products]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Snap back to selected label if user typed but didn't pick
        const p = products.find((p) => p.id === value);
        setQuery(p ? `${p.name} (${p.unit})` : '');
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [value, products]);

  const filtered = products.filter((p) => {
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q);
  }).slice(0, 20);

  function select(p: Product) {
    onChange(p.id);
    setQuery(`${p.name} (${p.unit})`);
    setOpen(false);
  }

  function clear() {
    onChange('');
    setQuery('');
    setOpen(true);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); onChange(''); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search product..."
          autoComplete="off"
          style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, padding: value ? '8px 28px 8px 10px' : '8px 10px',
            color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13,
            outline: 'none', width: '100%',
          }}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={clear}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12,
            }}
          >✕</button>
        )}
      </div>

      {open && !disabled && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, zIndex: 60,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,.4)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              No products found
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => select(p)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', textAlign: 'left', padding: '8px 12px',
                  background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', color: 'var(--text)', gap: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginLeft: 6 }}>
                    {p.unit}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--accent)', flexShrink: 0 }}>
                  ${Number(p.price).toFixed(2)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
