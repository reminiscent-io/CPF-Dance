import React from 'react'
import { Avatar } from './Avatar'

export interface PersonChipProps {
  name: string
  /** Show the full name instead of just the first name. */
  full?: boolean
  className?: string
}

/**
 * Compact avatar chip (initials + first name) for repeated entities in
 * table rows - tagged instructors, assigned dancers - so names read as
 * people, not as plain text repeated down a column.
 */
export function PersonChip({ name, full = false, className = '' }: PersonChipProps) {
  const display = full ? name : name.trim().split(/\s+/)[0]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-champagne-100 py-0.5 pl-0.5 pr-2.5 text-sm text-charcoal-700 ${className}`}
    >
      <Avatar name={name} size="xs" />
      {display}
    </span>
  )
}
