import { useState, useRef, useEffect } from 'react';
import { clientsApi } from '../../api/clients';
import type { Client } from '../../types';

interface Props {
  clients: Client[];
  value: string;           // selected client_id
  onChange: (id: string) => void;
  onClientCreated: (client: Client) => void;
}

export default function ClientCombobox({ clients, value, onChange, onClientCreated }: Props) {
  const selected = clients.find((c) => c.id === value) ?? null;

  const [query, setQuery]       = useState(selected?.name ?? '');
  const [open, setOpen]         = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving]     = useState(false);
  const [createErr, setCreateErr] = useState('');

  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync query when external value changes (e.g. form reset)
  useEffect(() => {
    setQuery(selected?.name ?? '');
  }, [value, selected?.name]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        // If nothing was selected, clear query so it doesn't show stale text
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
    setCreating(false);
  }

  function clear() {
    onChange('');
    setQuery('');
    setOpen(true);
  }

  async function handleCreate() {
    if (!newName.trim()) { setCreateErr('Name is required'); return; }
    setCreateErr('');
    setSaving(true);
    try {
      const client = await clientsApi.create({
        name: newName.trim(),
        phone: newPhone.trim() || null,
      });
      onClientCreated(client);
      select(client);
      setNewName('');
      setNewPhone('');
    } catch (e: any) {
      setCreateErr(e.response?.data?.detail ?? 'Failed to create client');
    } finally {
      setSaving(false);
    }
  }

  const showCreate = query.trim().length > 0 && filtered.length === 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(''); setOpen(true); setCreating(false); }}
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
              background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
              fontSize: 14, padding: 2,
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
          {!creating && (
            <>
              {filtered.length === 0 && !showCreate && (
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
                    cursor: 'pointer', color: 'var(--text)',
                    borderBottom: '1px solid var(--border)',
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

              {/* Create option */}
              <button
                type="button"
                onMouseDown={() => { setCreating(true); setNewName(query.trim()); }}
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
            </>
          )}

          {/* Inline create form */}
          {creating && (
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                New client
              </div>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name *"
                style={inlineInputStyle}
              />
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (optional)"
                style={{ ...inlineInputStyle, marginTop: 6 }}
              />
              {createErr && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{createErr}</div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button
                  type="button"
                  onMouseDown={() => { setCreating(false); setNewName(''); setNewPhone(''); setCreateErr(''); }}
                  style={{ ...actionBtnStyle, color: 'var(--muted)' }}
                >Cancel</button>
                <button
                  type="button"
                  onMouseDown={handleCreate}
                  disabled={saving}
                  style={{ ...actionBtnStyle, color: 'var(--accent)', fontWeight: 700 }}
                >
                  {saving ? 'Saving…' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inlineInputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', color: 'var(--text)',
  fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
};

const actionBtnStyle: React.CSSProperties = {
  flex: 1, padding: '7px', background: 'none',
  border: '1px solid var(--border)', borderRadius: 7,
  cursor: 'pointer', fontSize: 12, fontFamily: 'var(--sans)',
};
