import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import type { User, ToastType } from '../../types';
import { usersApi } from '../../api/users';

interface Props {
  user: User;
  onClose: () => void;
  onDeactivated: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function ConfirmDeactivate({ user, onClose, onDeactivated, toast }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      await usersApi.deactivate(user.id);
      toast(t('users.toast_deactivated'));
      onDeactivated();
    } catch (err: any) {
      toast(err.response?.data?.detail ?? t('common.failed_to_deactivate'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('users.deactivate_title')} onClose={onClose} width={380}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
        {t('users.deactivate_desc')}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{user.name}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 4, marginBottom: 24 }}>
        {user.email}
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
