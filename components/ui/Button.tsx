import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg ' +
    'transition-[background-color,border-color,box-shadow,color] duration-200 ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-rose-600 text-champagne-50 hover:bg-rose-700 focus:ring-rose-500 active:bg-rose-800',
    secondary: 'bg-mauve-600 text-champagne-50 hover:bg-mauve-700 focus:ring-mauve-500 active:bg-mauve-800',
    outline: 'border-2 border-rose-600 text-rose-600 hover:bg-rose-50 focus:ring-rose-500 active:bg-rose-100',
    gold: 'bg-gold-600 text-champagne-50 hover:bg-gold-700 focus:ring-gold-500 active:bg-gold-800 shadow-soft hover:shadow-soft-lg'
  }

  // 44px touch-target floor on default and lg sizes per DESIGN.md.
  // sm stays compact for dense desktop contexts where touch is not the primary input.
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base min-h-11',
    lg: 'px-6 py-3 text-lg min-h-11'
  }
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
