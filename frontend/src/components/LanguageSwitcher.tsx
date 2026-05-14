import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {LANGUAGES.map((lang, idx) => (
        <span key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {idx > 0 && (
            <span style={{ fontSize: 10, color: 'var(--border)', userSelect: 'none' }}>|</span>
          )}
          <button
            onClick={() => i18n.changeLanguage(lang.code)}
            style={{
              background: 'none',
              border: 'none',
              cursor: current.startsWith(lang.code) ? 'default' : 'pointer',
              fontSize: 11,
              fontFamily: 'var(--mono)',
              fontWeight: current.startsWith(lang.code) ? 800 : 400,
              color: current.startsWith(lang.code) ? 'var(--accent)' : 'var(--muted)',
              padding: '4px 4px',
              letterSpacing: '.05em',
              transition: 'color .15s',
            }}
          >
            {lang.label}
          </button>
        </span>
      ))}
    </div>
  );
}
