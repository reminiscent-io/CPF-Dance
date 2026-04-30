import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
  ...props
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const hoverStyles = hover
    ? 'hover:shadow-soft-lg hover:-translate-y-1 transition-[transform,box-shadow] duration-200'
    : ''

  return (
    <div
      className={`
        bg-champagne-50 rounded-lg shadow-soft
        ${paddingStyles[padding]}
        ${hoverStyles}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`border-b border-champagne-200 pb-4 mb-4 ${className}`}>
      {children}
    </div>
  )
}

export interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-xl font-semibold text-charcoal-950 ${className}`}>
      {children}
    </h3>
  )
}

export interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}
