import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export default function Modal({ title, subtitle, onClose, children, width = 420 }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 100, animation: 'fadeIn .15s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '32px', width, maxWidth: '95vw',
        animation: 'slideUp .2s ease',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24, fontFamily: 'var(--mono)' }}>
            {subtitle}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}