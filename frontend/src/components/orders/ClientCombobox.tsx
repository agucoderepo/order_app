import { useState, useRef, useEffect } from 'react';
import ClientModal from '../clients/ClientModal';
import type { Client, ToastType } from '../../types';

interface Props {
  clients: Client[];
  value: string;
  onChange: (id: string) => void;
  onClientCreated: (client: Client) => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function ClientCombobox({ clients, value, onChange, onClientCreated, toast }: Props) {
  const selected = clients.find((c) => c.id === value) ?? null;

  const [query, setQuery]           = useState(selected?.name ?? '');
  const [open, setOpen]             = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [pendingName, setPendingName] = useState('');

  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selected?.name ?? '');
  }, [value, selected?.name]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!document.contains(e.target as Node)) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!value) setQuery('');
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [value]);

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q);
  });

  function select(client: Client) {
    onChange(client.id);
    setQuery(client.name);
    setOpen(false);
  }

  function clear() {
    onChange('');
    setQuery('');
    setOpen(true);
  }

  function openCreate() {
    setPendingName(query.trim());
    setOpen(false);
    setShowModal(true);
  }

  return (
    <>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        {/* Input */}
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); onChange(''); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search or type client name..."
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '10px 36px 10px 14px',
              color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 14,
              outline: 'none', width: '100%',
            }}
            autoComplete="off"
          />
          {value && (
            <button
              type="button"
              onClick={clear}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: 2,
              }}
            >✕</button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            maxHeight: 260, overflowY: 'auto',
          }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                No clients found
              </div>
            )}

            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => select(c)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text)', borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                {c.phone && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 1 }}>{c.phone}</div>
                )}
              </button>
            ))}

            <button
              type="button"
              onMouseDown={openCreate}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--accent)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
                + New client{query.trim() ? `: "${query.trim()}"` : ''}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Reuse the same ClientModal used in the admin Clients page */}
      {showModal && (
        <ClientModal
          client={{ name: pendingName } as Client}
          toast={toast}
          onClose={() => setShowModal(false)}
          onSaved={(created) => {
            setShowModal(false);
            if (created) {
              onClientCreated(created);
              select(created);
            }
          }}
        />
      )}
    </>
  );
}
