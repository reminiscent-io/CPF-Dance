import React from 'react'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'rose' | 'mauve' | 'white' | 'gray'
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
    rose: 'border-rose-600',
    mauve: 'border-mauve-600',
    white: 'border-white',
    gray: 'border-gray-600'
  }
  
  return (
    <div
      className={`
        animate-spin rounded-full border-2 border-t-transparent
        ${sizes[size]}
        ${colors[color]}
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export interface LoadingOverlayProps {
  message?: string
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  )
}
