import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { clientsApi } from '../api/clients';
import ClientTable from '../components/clients/ClientTable';
import ClientModal from '../components/clients/ClientModal';
import ConfirmDeactivateClient from '../components/clients/ConfirmDeactivateClient';
import type { Client, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

type Modal =
  | { mode: 'create' }
  | { mode: 'edit'; client: Client }
  | { mode: 'confirm'; client: Client }
  | null;

export default function Clients({ toast }: Props) {
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setClients(await clientsApi.list());
    } catch (e: any) {
      toast(e.response?.data?.detail ?? t('clients.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.address ?? '').toLowerCase().includes(term) ||
      (c.phone ?? '').toLowerCase().includes(term)
    );
  });
  const active = clients.filter((c) => c.is_active).length;
  const inactive = clients.length - active;

  const stats = [
    { label: t('clients.stats_total'),    value: clients.length, color: 'var(--accent)' },
    { label: t('clients.stats_active'),   value: active,         color: 'var(--accent2)' },
    { label: t('clients.stats_inactive'), value: inactive,       color: 'var(--danger)' },
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
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t('clients.table_title')}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="toolbar-search"
              style={{ width: 220 }}
              placeholder={t('clients.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create' })}>
              {t('clients.new_button')}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <ClientTable clients={filtered} onEdit={(c) => setModal({ mode: 'edit', client: c })} onDeactivate={(c) => setModal({ mode: 'confirm', client: c })} />
        )}
      </div>

      {modal?.mode === 'create' && (
        <ClientModal toast={toast} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.mode === 'edit' && (
        <ClientModal client={modal.client} toast={toast} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.mode === 'confirm' && (
        <ConfirmDeactivateClient client={modal.client} toast={toast} onClose={() => setModal(null)} onDeactivated={() => { setModal(null); load(); }} />
      )}
    </>
  );
}
