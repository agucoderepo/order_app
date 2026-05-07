import { useState } from 'react';
import Modal from '../Modal';
import { providersApi } from '../../api/providers';
import type { Provider, ToastType } from '../../types';

interface Props {
  provider: Provider;
  onClose: () => void;
  onDeactivated: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function ConfirmDeactivateProvider({ provider, onClose, onDeactivated, toast }: Props) {
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      await providersApi.update(provider.id, { is_active: false });
      toast('Provider deactivated');
      onDeactivated();
    } catch (err: any) {
      toast(err.response?.data?.detail ?? 'Failed to deactivate', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Deactivate provider?" onClose={onClose} width={380}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
        This will mark the provider as inactive. They will still appear in historical purchase orders.
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{provider.name}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 4, marginBottom: 24 }}>
        {provider.phone || 'No phone'}
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
