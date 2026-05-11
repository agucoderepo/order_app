import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { providersApi } from '../../api/providers';
import type { Provider, ProviderCreate, ProviderUpdate, ToastType } from '../../types';

interface Props {
  provider?: Provider;
  onClose: () => void;
  onSaved: () => void;
  toast: (msg: string, type?: ToastType) => void;
}

export default function ProviderModal({ provider, onClose, onSaved, toast }: Props) {
  const { t } = useTranslation();
  const editing = !!provider?.id;
  const [form, setForm] = useState({
    name: provider?.name ?? '',
    contact_name: provider?.contact_name ?? '',
    phone: provider?.phone ?? '',
    address: provider?.address ?? '',
    notes: provider?.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editing) {
        const body: ProviderUpdate = {
          name: form.name.trim(),
          contact_name: form.contact_name.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        };
        await providersApi.update(provider!.id, body);
        toast(t('providers.toast_updated'));
      } else {
        const body: ProviderCreate = {
          name: form.name.trim(),
          contact_name: form.contact_name.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        };
        await providersApi.create(body);
        toast(t('providers.toast_created'));
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={editing ? t('providers.modal_title_edit') : t('providers.modal_title_new')} subtitle={t('providers.modal_sub')} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>{t('providers.field_name')}</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Distribuidora XYZ" required />
        </div>

        <div className="field">
          <label>{t('providers.field_contact_name')}</label>
          <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="Juan García" />
        </div>

        <div className="field">
          <label>{t('providers.field_phone')}</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+54 11 5555 1234" />
        </div>

        <div className="field">
          <label>{t('providers.field_address')}</label>
          <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, number, city" />
        </div>

        <div className="field">
          <label>{t('providers.field_notes')}</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder={t('providers.notes_placeholder')}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? <span className="spinner" /> : editing ? t('providers.save_button') : t('providers.create_button')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
