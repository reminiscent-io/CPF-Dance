'use client'

export type BannerTone = 'success' | 'gilt' | 'error' | 'neutral'

export interface RequestBannerProps {
  tone: BannerTone
  message: string
  onDismiss: () => void
}

const toneStyles: Record<BannerTone, { surface: string; accentVar: string; text: string; label: string }> = {
  success: {
    surface: 'bg-champagne-100',
    accentVar: 'var(--color-rose-600)',
    text: 'text-charcoal-900',
    label: 'Notice'
  },
  gilt: {
    surface: 'bg-champagne-100',
    accentVar: 'var(--color-gold-600)',
    text: 'text-charcoal-900',
    label: 'Confirmed'
  },
  error: {
    surface: 'bg-champagne-100',
    accentVar: 'var(--color-rose-600)',
    text: 'text-charcoal-900',
    label: 'Heads up'
  },
  neutral: {
    surface: 'bg-champagne-100',
    accentVar: 'var(--color-champagne-300)',
    text: 'text-charcoal-700',
    label: 'Notice'
  }
}

export function RequestBanner({ tone, message, onDismiss }: RequestBannerProps) {
  const styles = toneStyles[tone]
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.surface} rounded-lg flex items-start gap-3 px-4 py-3 animate-slideDown`}
      style={{ borderLeft: `1px solid ${styles.accentVar}` }}
    >
      <span className="sr-only">{styles.label}: </span>
      <p className={`flex-1 text-sm ${styles.text} leading-relaxed`}>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-charcoal-500 hover:text-charcoal-800 transition-colors -mt-0.5 p-1"
        aria-label="Dismiss"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
