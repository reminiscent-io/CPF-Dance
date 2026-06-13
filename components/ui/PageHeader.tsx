import React from 'react'

export interface PageHeaderProps {
  title: string
  subtitle: string
  /** Primary action slot. Exactly one filled-rose button per page lives here. */
  action?: React.ReactNode
}

/**
 * Shared page shell header. Every portal tab opens with this so titles,
 * subtitles, and the primary action sit on identical rails at identical
 * heights across the app.
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-serif text-3xl font-semibold tracking-[-0.02em] text-charcoal-950">
          {title}
        </h1>
        <p className="mt-1 text-sm text-charcoal-500">{subtitle}</p>
      </div>
      {action && (
        /* h-9 matches the H1 line box, so the action centers against the
           title's cap height and ignores the subtitle below it. */
        <div className="flex h-9 items-center">{action}</div>
      )}
    </header>
  )
}
