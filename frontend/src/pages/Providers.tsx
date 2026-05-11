import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { providersApi } from '../api/providers';
import ProviderTable from '../components/providers/ProviderTable';
import ProviderModal from '../components/providers/ProviderModal';
import ConfirmDeactivateProvider from '../components/providers/ConfirmDeactivateProvider';
import type { Provider, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

type Modal =
  | { mode: 'create' }
  | { mode: 'edit'; provider: Provider }
  | { mode: 'confirm'; provider: Provider }
  | null;

export default function Providers({ toast }: Props) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProviders(await providersApi.list());
    } catch (e: any) {
      toast(e.response?.data?.detail ?? t('providers.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => { load(); }, [load]);

  const filtered = providers.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.contact_name ?? '').toLowerCase().includes(term) ||
      (p.phone ?? '').toLowerCase().includes(term) ||
      (p.address ?? '').toLowerCase().includes(term)
    );
  });
  const active = providers.filter((p) => p.is_active).length;
  const inactive = providers.length - active;

  const stats = [
    { label: t('providers.stats_total'),    value: providers.length, color: 'var(--accent)' },
    { label: t('providers.stats_active'),   value: active,           color: 'var(--accent2)' },
    { label: t('providers.stats_inactive'), value: inactive,         color: 'var(--danger)' },
  ];

  return (
    <>
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t('providers.table_title')}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="toolbar-search"
              style={{ width: 260 }}
              placeholder={t('providers.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create' })}>
              {t('providers.new_button')}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <ProviderTable providers={filtered} onEdit={(p) => setModal({ mode: 'edit', provider: p })} onDeactivate={(p) => setModal({ mode: 'confirm', provider: p })} />
        )}
      </div>

      {modal?.mode === 'create' && (
        <ProviderModal toast={toast} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.mode === 'edit' && (
        <ProviderModal provider={modal.provider} toast={toast} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.mode === 'confirm' && (
        <ConfirmDeactivateProvider provider={modal.provider} toast={toast} onClose={() => setModal(null)} onDeactivated={() => { setModal(null); load(); }} />
      )}
    </>
  );
}
