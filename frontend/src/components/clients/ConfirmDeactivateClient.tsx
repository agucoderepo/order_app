import { useState } from 'react';
import Modal from '../Modal';
import { clientsApi } from '../../api/clients';
import type { Client, ToastType } from '../../types';

interface Props {
  client: Client;
  onClose: () => void;
  onDeactivated: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function ConfirmDeactivateClient({ client, onClose, onDeactivated, toast }: Props) {
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      await clientsApi.update(client.id, { is_active: false });
      toast('Client deactivated');
      onDeactivated();
    } catch (err: any) {
      toast(err.response?.data?.detail ?? 'Failed to deactivate', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Deactivate client?" onClose={onClose} width={380}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
        This will mark the client as inactive. They will still appear in historical orders.
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{client.name}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 4, marginBottom: 24 }}>
        {client.phone || 'No phone'}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger btn-sm" onClick={confirm} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Deactivate'}
        </button>
      </div>
    </Modal>
  );
}
