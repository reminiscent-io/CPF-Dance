'use client'

import React from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
}

/**
 * Joined segment group for view/filter switching: one shared border, one
 * outer radius, equal-width segments, control-height to match inputs.
 * The selected segment is the only filled-rose element outside the page's
 * primary action.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="grid h-control grid-flow-col auto-cols-fr overflow-hidden rounded-lg border border-champagne-300 bg-champagne-50"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-w-[4rem] px-4 text-sm font-medium transition-colors duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500
              ${
                selected
                  ? 'bg-rose-600 text-champagne-50'
                  : 'text-charcoal-500 hover:bg-champagne-100 hover:text-charcoal-900'
              }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
