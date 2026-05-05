import type { ToastItem } from '../types';

interface Props { toasts: ToastItem[]; }

export default function Toast({ toasts }: Props) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8, zIndex: 300,
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          animation: 'slideUp .2s ease', minWidth: 220,
          display: 'flex', alignItems: 'center', gap: 8,
          ...(t.type === 'success'
            ? { background: 'rgba(74,240,200,.15)', border: '1px solid rgba(74,240,200,.3)', color: 'var(--accent2)' }
            : { background: 'rgba(240,74,106,.15)', border: '1px solid rgba(240,74,106,.3)', color: 'var(--danger)' }
          ),
        }}>
          {t.type === 'success' ? '✓' : '✕'} {t.msg}
        </div>
      ))}
    </div>
  );
}