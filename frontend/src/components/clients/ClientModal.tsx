import { useState } from 'react';
import Modal from '../Modal';
import { clientsApi } from '../../api/clients';
import type { Client, ClientCreate, ClientUpdate, ToastType } from '../../types';

interface Props {
  client?: Client;
  onClose: () => void;
  onSaved: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function ClientModal({ client, onClose, onSaved, toast }: Props) {
  const editing = !!client?.id;
  const [form, setForm] = useState({
    name: client?.name ?? '',
    address: client?.address ?? '',
    phone: client?.phone ?? '',
    notes: client?.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editing) {
        const body: ClientUpdate = {
          name: form.name.trim(),
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
        };
        await clientsApi.update(client!.id, body);
        toast('Client updated');
      } else {
        const body: ClientCreate = {
          name: form.name.trim(),
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
        };
        await clientsApi.create(body);
        toast('Client created');
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={editing ? 'Edit client' : 'New client'} subtitle="Client contact details" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Acme Foods"
            required
          />
        </div>

        <div className="field">
          <label>Phone</label>
          <input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+54 11 5555 1234"
          />
        </div>

        <div className="field">
          <label>Address</label>
          <input
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Street, number, city"
          />
        </div>

        <div className="field">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Preferred delivery window, special requests..."
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? <span className="spinner" /> : editing ? 'Save changes' : 'Create client'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
