import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auditLogsApi } from '../api/audit-logs';
import type { AuditLog, AuditLogFilters, ToastType } from '../types';

interface Props {
  toast: (msg: string, type?: ToastType) => void;
}

const ACTION_OPTIONS = [
  '', 'order.create', 'order.update',
  'shopping_list.aggregate', 'shopping_list.adjust_item', 'shopping_list.finalize', 'shopping_list.reopen',
  'purchase_order.update',
  'client.create', 'client.update',
  'provider.create', 'provider.update',
  'product.create', 'product.update',
  'user.create', 'user.update',
];

const ENTITY_OPTIONS = ['', 'order', 'shopping_list', 'shopping_list_item', 'purchase_order', 'client', 'provider', 'product', 'user'];

export default function AuditLog({ toast }: Props) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({ limit: 200 });

  async function load() {
    setLoading(true);
    try {
      setLogs(await auditLogsApi.list(filters));
    } catch {
      toast(t('audit_log.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function setFilter(key: keyof AuditLogFilters, value: string | number | undefined) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <select
          className="toolbar-search"
          style={{ width: 190 }}
          value={filters.action ?? ''}
          onChange={(e) => setFilter('action', e.target.value)}
        >
          {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a || t('audit_log.all_actions')}</option>)}
        </select>

        <select
          className="toolbar-search"
          style={{ width: 170 }}
          value={filters.entity_type ?? ''}
          onChange={(e) => setFilter('entity_type', e.target.value)}
        >
          {ENTITY_OPTIONS.map((e) => <option key={e} value={e}>{e || t('audit_log.all_entities')}</option>)}
        </select>

        <input
          className="toolbar-search"
          style={{ width: 140 }}
          type="date"
          value={filters.date_from ?? ''}
          onChange={(e) => setFilter('date_from', e.target.value)}
          placeholder="From"
          title="From date"
        />
        <input
          className="toolbar-search"
          style={{ width: 140 }}
          type="date"
          value={filters.date_to ?? ''}
          onChange={(e) => setFilter('date_to', e.target.value)}
          placeholder="To"
          title="To date"
        />

        <button className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
          {loading ? <span className="spinner" /> : t('common.apply')}
        </button>
      </div>

      {/* Count */}
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 12 }}>
        {t('audit_log.entry', { count: logs.length })}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {[
                t('audit_log.col_timestamp'),
                t('audit_log.col_user'),
                t('audit_log.col_action'),
                t('audit_log.col_entity'),
                t('audit_log.col_id'),
                t('audit_log.col_detail'),
              ].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)' }}>
                  {t('audit_log.empty')}
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 12 }}>{log.user_email}</td>
                <td style={tdStyle}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'rgba(200,240,74,.1)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4 }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{log.entity_type ?? '—'}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.entity_id ?? '—'}</td>
                <td style={{ ...tdStyle, fontSize: 12, color: 'var(--muted)', maxWidth: 240, wordBreak: 'break-word' }}>{log.detail ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  fontSize: 11,
  color: 'var(--muted)',
  fontFamily: 'var(--mono)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  padding: '10px 16px',
  whiteSpace: 'nowrap',
} as const;

const tdStyle = {
  padding: '11px 16px',
} as const;
