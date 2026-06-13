import React from 'react'

export type StatusTone = 'positive' | 'neutral' | 'attention' | 'accent'

export interface StatusDotProps {
  tone: StatusTone
  label: string
  className?: string
}

/* Dot carries the state color; the label stays neutral ink. Tones collapse
   onto the Ballet Noir palette: positive reads as a Curtain Gilt moment,
   attention as deep Stage Rose. No green/yellow/red leaks. */
const tones: Record<StatusTone, string> = {
  positive: 'bg-gold-500',
  neutral: 'bg-champagne-400',
  attention: 'bg-rose-700',
  accent: 'bg-rose-500'
}

/**
 * Status as dot + text, the one status treatment for table rows. Pills are
 * reserved for filters so "Active" the filter and "Active" the state never
 * share a shape.
 */
export function StatusDot({ tone, label, className = '' }: StatusDotProps) {
  return (
    <span className={`inline-flex items-center gap-2 text-cell text-charcoal-700 ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${tones[tone]}`} />
      {label}
    </span>
  )
}
