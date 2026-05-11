import { useTranslation } from 'react-i18next';
import type { Provider } from '../../types';

interface Props {
  providers: Provider[];
  onEdit: (provider: Provider) => void;
  onDeactivate: (provider: Provider) => void;
}

export default function ProviderTable({ providers, onEdit, onDeactivate }: Props) {
  const { t } = useTranslation();

  if (!providers.length) {
    return <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>{t('providers.empty')}</div>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={headerCellStyle}>{t('providers.col_name')}</th>
          <th style={headerCellStyle}>{t('providers.col_contact')}</th>
          <th style={headerCellStyle}>{t('providers.col_phone')}</th>
          <th style={headerCellStyle}>{t('providers.col_address')}</th>
          <th style={headerCellStyle}>{t('providers.col_status')}</th>
          <th style={headerCellStyle}>{t('providers.col_actions')}</th>
        </tr>
      </thead>
      <tbody>
        {providers.map((p) => (
          <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={cellStyle}>
              <div style={{ fontWeight: 700 }}>{p.name}</div>
              {p.notes && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{p.notes}</div>}
            </td>
            <td style={cellStyle}>{p.contact_name || '—'}</td>
            <td style={cellStyle}>{p.phone || '—'}</td>
            <td style={cellStyle}>{p.address || '—'}</td>
            <td style={cellStyle}>
              <span className={`badge ${p.is_active ? 'badge-admin' : 'badge-operator'}`}>
                <span className="dot" />
                {p.is_active ? t('common.active') : t('common.inactive')}
              </span>
            </td>
            <td style={cellStyle}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(p)}>{t('common.edit')}</button>
                {p.is_active && (
                  <button className="btn btn-danger btn-sm" onClick={() => onDeactivate(p)}>{t('common.deactivate')}</button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const headerCellStyle = {
  textAlign: 'left',
  fontSize: 11,
  color: 'var(--muted)',
  fontFamily: 'var(--mono)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  padding: '12px 20px',
} as const;

const cellStyle = {
  padding: '14px 20px',
  fontSize: 13,
} as const;
