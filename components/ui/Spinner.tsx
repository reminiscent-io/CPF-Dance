import React from 'react'

/*
 * Spinners are SVG strokes, not CSS border rings. globals.css sets
 * `* { border-color: champagne-200 }` outside any cascade layer, which beats
 * Tailwind's border utilities: a border ring rendered as a uniform beige
 * circle with no gap, spinning with no visible motion.
 */
function SpinnerArc({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`animate-spin ${className}`}>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.2"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'rose' | 'gilt' | 'champagne' | 'graphite'
  className?: string
}

export function Spinner({
  size = 'md',
  color = 'rose',
  className = ''
}: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const colors = {
    rose: 'text-rose-600',
    gilt: 'text-gold-600',
    champagne: 'text-champagne-50',
    graphite: 'text-charcoal-500'
  }

  return (
    <div
      className={`${sizes[size]} ${colors[color]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <SpinnerArc className="block h-full w-full" />
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * A text-sized spinner for inside buttons and inline labels. It inherits the
 * surrounding text color and scales with font size, so it sits on a rose
 * primary button and a charcoal outline button alike. Decorative: the button
 * carries `aria-busy` and keeps its own label.
 */
export function InlineSpinner({ className = '' }: { className?: string }) {
  return <SpinnerArc className={`inline-block h-[1em] w-[1em] shrink-0 ${className}`} />
}

export interface LoadingOverlayProps {
  message?: string
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(10, 10, 10, 0.5)' }}
    >
      <div className="bg-champagne-50 rounded-lg p-8 flex flex-col items-center gap-4 shadow-soft-lg">
        <Spinner size="lg" />
        <p className="text-charcoal-700 font-medium">{message}</p>
      </div>
    </div>
  )
}
