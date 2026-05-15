import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { usersApi } from '../../api/users';
import type { User, ToastType } from '../../types';

interface Props {
  user: User;
  onClose: () => void;
  onSaved: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function ResetPasswordModal({ user, onClose, onSaved, toast }: Props) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t('users.passwords_dont_match'));
      return;
    }
    setLoading(true);
    try {
      await usersApi.update(user.id, { password });
      toast(t('users.toast_password_reset'));
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title={t('users.reset_password_title')}
      subtitle={t('users.reset_password_sub', { name: user.name })}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="field">
          <label>{t('users.field_new_password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('users.password_placeholder_min')}
            minLength={8}
            required
            autoFocus
          />
        </div>

        <div className="field">
          <label>{t('users.field_confirm_password')}</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </div>

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? <span className="spinner" /> : t('users.reset_password_button')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
