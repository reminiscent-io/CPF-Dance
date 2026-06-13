import React from 'react'

export interface SelectOption {
  value: string | number
  label: string
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
}

const labelClass = 'block text-sm font-medium text-charcoal-500 mb-1'
const fieldClass =
  'w-full min-h-control px-4 py-2 pr-10 border rounded-lg bg-champagne-50 text-charcoal-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent ' +
  'transition-[border-color,box-shadow,background-color] duration-200 ' +
  'disabled:bg-champagne-200 disabled:text-charcoal-300 disabled:cursor-not-allowed ' +
  'appearance-none bg-no-repeat'
const errorClass = 'mt-1 text-sm text-rose-700'
const helperClass = 'mt-1 text-sm text-charcoal-500'

// Inline SVG chevron, tinted charcoal-500 (#4d4d4d). URL-encoded.
const chevronStyle: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%234d4d4d'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")",
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '1rem 1rem',
}

export function Select({
  label,
  error,
  helperText,
  options,
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id || (props.name ? `select-${props.name}` : undefined)

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className={labelClass}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          ${fieldClass}
          ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-champagne-200'}
          ${className}
        `}
        style={chevronStyle}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
        }
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className={errorClass}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${selectId}-helper`} className={helperClass}>
          {helperText}
        </p>
      )}
    </div>
  )
}
