import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import type { User } from '../../types';

interface Props {
  user: User;
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

export default function UserDetailModal({ user, onClose, onEdit, onDeactivate }: Props) {
  const { t } = useTranslation();

  return (
    <Modal title={user.name} subtitle={user.email} onClose={onClose} width={460}>
      <div style={{ marginBottom: 24 }}>
        <Row label={t('users.field_email')} value={<span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{user.email}</span>} />
        <Row label={t('users.field_role')} value={
          <span className={`badge badge-${user.role}`}>
            <span className="dot" />{user.role}
          </span>
        } />
        <Row label={t('users.col_status')} value={
          <span className={`badge badge-${user.is_active ? 'active' : 'inactive'}`}>
            <span className="dot" />{user.is_active ? t('common.active') : t('common.inactive')}
          </span>
        } />
        <Row label={t('users.col_created')} value={
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
            {new Date(user.created_at).toLocaleDateString()}
          </span>
        } />
        <Row label={t('common.updated')} value={
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
            {new Date(user.updated_at).toLocaleDateString()}
          </span>
        } />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.close')}</button>
        {user.is_active && (
          <button className="btn btn-danger btn-sm" onClick={onDeactivate}>{t('common.deactivate')}</button>
        )}
        <button className="btn btn-primary btn-sm" onClick={onEdit}>{t('common.edit')}</button>
      </div>
    </Modal>
  );
}
