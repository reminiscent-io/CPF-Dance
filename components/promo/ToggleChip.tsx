'use client'

import React from 'react'

export interface ToggleChipProps {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

/** DESIGN.md chips: Rose Chip when selected, Neutral Chip otherwise. */
export function ToggleChip({ selected, onClick, children, disabled, className = '' }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded px-3 text-sm font-medium tracking-[0.01em]
        transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
        disabled:cursor-not-allowed disabled:text-charcoal-300
        ${selected ? 'bg-ballet-pink-100 text-ballet-pink-800' : 'bg-champagne-100 text-charcoal-600 hover:bg-champagne-200'}
        ${className}`}
    >
      {children}
    </button>
  )
}
