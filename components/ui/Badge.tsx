import React from 'react'

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}: BadgeProps) {
  // Semantic variants collapse onto the four-family palette per DESIGN.md.
  // success reads as a Curtain Gilt moment; warning and danger as Stage Rose
  // moments. No green / yellow / red leaks into the system.
  const variants = {
    default: 'bg-champagne-100 text-charcoal-700',
    primary: 'bg-ballet-pink-100 text-ballet-pink-800',
    secondary: 'bg-ballet-pink-100 text-ballet-pink-800',
    success: 'bg-gold-100 text-gold-800',
    warning: 'bg-ballet-pink-200 text-ballet-pink-900',
    danger: 'bg-ballet-pink-200 text-ballet-pink-900'
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }
  
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
