import { useState } from 'react';
import Modal from '../Modal';
import { usersApi } from '../../api/users';
import type { User, UserCreate, UserUpdate, ToastType } from '../../types';

interface Props {
  user?: User;                                      // undefined = create mode
  onClose: () => void;
  onSaved: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function UserModal({ user, onClose, onSaved, toast }: Props) {
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!editing && !form.password) {
      setError('Password is required'); return;
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
        toast('User updated');
      } else {
        const body: UserCreate = {
          name: form.name,
          email: form.email,
          role: form.role,
          password: form.password,
        };
        await usersApi.create(body);
        toast('User created');
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title={editing ? 'Edit user' : 'New user'}
      subtitle={editing ? `Editing ${user!.email}` : 'Create a new account'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="field">
          <label>Full name</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="María García"
            required
          />
        </div>

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="maria@example.com"
            required
          />
        </div>

        <div className="field">
          <label>Role</label>
          <select value={form.role} onChange={(e) => set('role', e.target.value as 'admin' | 'operator')}>
            <option value="operator">Operator — create and manage orders</option>
            <option value="admin">Admin — full access</option>
          </select>
        </div>

        <div className="field">
          <label>{editing ? 'New password (leave blank to keep current)' : 'Password'}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder={editing ? '••••••••' : 'Min. 8 characters'}
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
              {form.is_active ? 'Account active' : 'Account inactive'}
            </span>
          </div>
        )}

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? <span className="spinner" /> : (editing ? 'Save changes' : 'Create user')}
          </button>
        </div>
      </form>
    </Modal>
  );
}