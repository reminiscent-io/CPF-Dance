import React from 'react'
import { InlineSpinner } from './Spinner'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  /**
   * The button's action is in flight. Shows a spinner beside the label and
   * blocks repeat clicks. Unlike `disabled`, it keeps full strength: a faded
   * button on a slow connection reads as broken, not busy.
   */
  loading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  loading = false,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg ' +
    'transition-[background-color,border-color,box-shadow,color] duration-200 ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
    (loading ? 'cursor-progress' : 'disabled:opacity-50 disabled:cursor-not-allowed')

  // Filled rose is reserved for the one primary action per page and for
  // selected states. Everything else gets neutral borders/text.
  const variants = {
    primary: 'bg-rose-600 text-champagne-50 hover:bg-rose-700 focus:ring-rose-500 active:bg-rose-800',
    secondary: 'border border-champagne-300 text-charcoal-700 hover:bg-champagne-100 focus:ring-rose-500 active:bg-champagne-200',
    outline: 'border border-champagne-300 text-charcoal-700 hover:bg-champagne-100 focus:ring-rose-500 active:bg-champagne-200',
    ghost: 'text-charcoal-500 hover:text-rose-700 hover:bg-champagne-100 focus:ring-rose-500 active:bg-champagne-200',
    gold: 'bg-gold-600 text-champagne-50 hover:bg-gold-700 focus:ring-gold-500 active:bg-gold-800'
  }

  // md and lg sit on the shared control height (44px) so buttons, inputs,
  // and segmented controls all match. sm stays compact for row-level
  // actions inside dense desktop tables.
  const sizes = {
    sm: 'min-h-9 px-3 py-1.5 text-sm',
    md: 'min-h-control px-4 py-2 text-base',
    lg: 'min-h-control px-6 py-2.5 text-lg'
  }
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <InlineSpinner className="mr-2" />}
      {children}
    </button>
  )
}
