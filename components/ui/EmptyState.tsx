import React from 'react'

export interface EmptyStateProps {
  /** One plain-language sentence. */
  message: string
  icon?: React.ReactNode
  /** Optional primary action, e.g. the same "Add student" the header offers. */
  action?: React.ReactNode
  className?: string
}

/**
 * Designed empty state for tables, lists, and grids. One sentence, optional
 * icon, optional action - never a bare "No results".
 */
export function EmptyState({ message, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center ${className}`}>
      {icon && <div className="mb-3 text-champagne-400 [&>svg]:h-8 [&>svg]:w-8">{icon}</div>}
      <p className="font-serif text-xl text-charcoal-700">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
