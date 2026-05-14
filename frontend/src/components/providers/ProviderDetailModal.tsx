import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import type { Provider } from '../../types';

interface Props {
  provider: Provider;
  onClose: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 110, flexShrink: 0, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '.06em', textTransform: 'uppercase', paddingTop: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, flex: 1 }}>{value}</div>
    </div>
  );
}

export default function ProviderDetailModal({ provider, onClose, onEdit, onDeactivate }: Props) {
  const { t } = useTranslation();

  return (
    <Modal title={provider.name} onClose={onClose} width={460}>
      <div style={{ marginBottom: 24 }}>
        <Row label={t('providers.col_contact')} value={provider.contact_name || '—'} />
        <Row label={t('providers.col_phone')} value={
          provider.phone
            ? <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{provider.phone}</span>
            : '—'
        } />
        <Row label={t('providers.col_address')} value={provider.address || '—'} />
        <Row label={t('providers.col_notes')} value={provider.notes || '—'} />
        <Row label={t('providers.col_status')} value={
          <span className={`badge ${provider.is_active ? 'badge-admin' : 'badge-operator'}`}>
            <span className="dot" />{provider.is_active ? t('common.active') : t('common.inactive')}
          </span>
        } />
        <Row label={t('common.created')} value={
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
            {new Date(provider.created_at).toLocaleDateString()}
          </span>
        } />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.close')}</button>
        {provider.is_active && (
          <button className="btn btn-danger btn-sm" onClick={onDeactivate}>{t('common.deactivate')}</button>
        )}
        <button className="btn btn-primary btn-sm" onClick={onEdit}>{t('common.edit')}</button>
      </div>
    </Modal>
  );
}
