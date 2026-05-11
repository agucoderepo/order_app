import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { usersApi } from '../../api/users';
import type { User, UserCreate, UserUpdate, ToastType } from '../../types';

interface Props {
  user?: User;
  onClose: () => void;
  onSaved: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function UserModal({ user, onClose, onSaved, toast }: Props) {
  const { t } = useTranslation();
  const editing = !!user?.id;

  const [form, setForm] = useState({
    name:      user?.name     ?? '',
    email:     user?.email    ?? '',
    role:      user?.role     ?? 'operator' as 'admin' | 'operator',
    is_active: user?.is_active ?? true,
    password:  '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!editing && !form.password) {
      setError(t('users.password_required')); return;
    }

    setLoading(true);
    try {
      if (editing) {
        const body: UserUpdate = {
          name: form.name,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        };
        if (form.password) body.password = form.password;
        await usersApi.update(user!.id, body);
        toast(t('users.toast_updated'));
      } else {
        const body: UserCreate = {
          name: form.name,
          email: form.email,
          role: form.role,
          password: form.password,
        };
        await usersApi.create(body);
        toast(t('users.toast_created'));
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title={editing ? t('users.modal_title_edit') : t('users.modal_title_new')}
      subtitle={editing ? t('users.modal_sub_edit', { email: user!.email }) : t('users.modal_sub_new')}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="field">
          <label>{t('users.field_fullname')}</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="María García"
            required
          />
        </div>

        <div className="field">
          <label>{t('users.field_email')}</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="maria@example.com"
            required
          />
        </div>

        <div className="field">
          <label>{t('users.field_role')}</label>
          <select value={form.role} onChange={(e) => set('role', e.target.value as 'admin' | 'operator')}>
            <option value="operator">{t('users.role_operator')}</option>
            <option value="admin">{t('users.role_admin')}</option>
          </select>
        </div>

        <div className="field">
          <label>{editing ? t('users.field_new_password') : t('users.field_password')}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder={editing ? '••••••••' : t('users.password_placeholder_min')}
            minLength={8}
            required={!editing}
          />
        </div>

        {editing && (
          <div className="toggle-wrap">
            <button
              type="button"
              className={`toggle ${form.is_active ? 'on' : ''}`}
              onClick={() => set('is_active', !form.is_active)}
            />
            <span className="toggle-label">
              {form.is_active ? t('users.account_active') : t('users.account_inactive')}
            </span>
          </div>
        )}

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? <span className="spinner" /> : (editing ? t('users.save_button') : t('users.create_button'))}
          </button>
        </div>
      </form>
    </Modal>
  );
}
