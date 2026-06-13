import React from 'react'

export interface ToolbarProps {
  /** Search field, pinned to the left rail. */
  search?: React.ReactNode
  /** Filters (usually a SegmentedControl), pinned to the right rail. */
  filters?: React.ReactNode
}

/**
 * The search + filter row that sits between the PageHeader and the content.
 * Spacing above (header-gap) and the left/right rails are owned here so
 * every tab's toolbar is structurally identical.
 */
export function Toolbar({ search, filters }: ToolbarProps) {
  return (
    <div className="mt-header-gap flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {search ? <div className="w-full sm:max-w-sm">{search}</div> : <div />}
      {filters && <div className="flex items-center gap-3">{filters}</div>}
    </div>
  )
}
