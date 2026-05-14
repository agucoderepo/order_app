import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      await providersApi.update(provider.id, { is_active: false });
      toast(t('providers.toast_deactivated'));
      onDeactivated();
    } catch (err: any) {
      toast(err.response?.data?.detail ?? t('common.failed_to_deactivate'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('providers.deactivate_title')} onClose={onClose} width={380}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
        {t('providers.deactivate_desc')}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{provider.name}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 4, marginBottom: 24 }}>
        {provider.phone || t('common.no_phone')}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-danger btn-sm" onClick={confirm} disabled={loading}>
          {loading ? <span className="spinner" /> : t('common.deactivate')}
        </button>
      </div>
    </Modal>
  );
}
