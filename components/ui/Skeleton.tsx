import React from 'react'

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  className?: string
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = ''
}: SkeletonProps) {
  const baseClass = 'skeleton-shimmer'

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  }

  const style: React.CSSProperties = {}

  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width
  }

  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height
  } else if (variant === 'text') {
    style.height = '1em'
  }

  return (
    <div
      className={`${baseClass} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

/**
 * A short stack of text lines with a ragged final line, the way real prose
 * sits. `widths` controls line count and length; the default reads as a
 * three-line paragraph.
 */
export function SkeletonText({
  widths = ['100%', '92%', '70%'],
  height = 12,
  gap = 'space-y-2',
}: {
  widths?: (string | number)[]
  height?: number
  gap?: string
}) {
  return (
    <div className={gap} aria-hidden="true">
      {widths.map((w, i) => (
        <Skeleton key={i} variant="text" width={w} height={height} />
      ))}
    </div>
  )
}

/**
 * Page-title rail skeleton matching `PageHeader`: a serif-scale title bar,
 * a subtitle bar, and an optional right-aligned action chip.
 */
export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4" aria-hidden="true">
      <div className="min-w-0 space-y-2.5">
        <Skeleton variant="text" width={200} height={30} />
        <Skeleton variant="text" width={260} height={14} />
      </div>
      {withAction && <Skeleton variant="rectangular" width={120} height={36} />}
    </div>
  )
}

/** Filter / search controls strip that sits above list and grid content. */
export function SkeletonToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-3" aria-hidden="true">
      <Skeleton variant="rectangular" width={220} height={38} />
      <Skeleton variant="rectangular" width={120} height={38} />
      <Skeleton variant="rectangular" width={96} height={38} />
    </div>
  )
}

/** One generic content card: a title line plus a short paragraph. */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-champagne-200 bg-champagne-50 p-6 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <Skeleton variant="text" width="55%" height={20} />
        <Skeleton variant="text" width={40} height={12} />
      </div>
      <SkeletonText widths={['100%', '88%', '66%']} />
    </div>
  )
}

/**
 * Grid of content cards for card-list pages (classes, studios, assets,
 * waiver templates). `cols` mirrors the page's own responsive grid so the
 * skeleton and the real content occupy the same footprint.
 */
export function SkeletonCardGrid({
  count = 6,
  cols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  gap = 'gap-4',
}: {
  count?: number
  cols?: string
  gap?: string
}) {
  return (
    <div className={`grid ${cols} ${gap}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

/**
 * Divided rows inside a single card boundary, matching the portal's list
 * views (recent activity, notes list, requests). One leading marker, two
 * stacked text lines, a trailing chip.
 */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-champagne-200 bg-champagne-50">
      <ul className="divide-y divide-champagne-200" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-6 py-5">
            <Skeleton variant="circular" width={20} height={20} className="shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width={i % 2 ? '55%' : '70%'} height={15} />
              <Skeleton variant="text" width="35%" height={12} />
            </div>
            <Skeleton variant="rectangular" width={68} height={28} className="shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Bare table skeleton for table pages whose own `Table` is not yet mounted. */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-champagne-200 bg-champagne-50">
      <div className="border-b border-champagne-200 px-5 py-3 flex gap-8">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} variant="text" width={c === 0 ? 120 : 80} height={12} />
        ))}
      </div>
      <ul className="divide-y divide-champagne-200" aria-hidden="true">
        {Array.from({ length: rows }).map((_, r) => (
          <li key={r} className="flex gap-8 px-5 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                variant="text"
                width={c === 0 ? '40%' : '20%'}
                height={14}
                className="flex-1"
              />
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Detail / form page: a couple of stacked content cards. */
export function SkeletonDetail() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <SkeletonCard />
      <div className="rounded-lg border border-champagne-200 bg-champagne-50 p-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton variant="text" width={120} height={12} />
            <Skeleton variant="rectangular" width="100%" height={40} />
          </div>
        ))}
      </div>
    </div>
  )
}

type PageSkeletonVariant = 'list' | 'cards' | 'table' | 'detail' | 'dashboard'

/**
 * Full in-shell page skeleton for the auth-resolution gate. Render this
 * inside `PortalLayout` instead of a full-screen spinner so the sidebar,
 * header rail, and page title stay put while the role and data resolve.
 */
export function PageSkeleton({
  variant = 'list',
  withAction = false,
  withToolbar = false,
  cardCols,
}: {
  variant?: PageSkeletonVariant
  withAction?: boolean
  withToolbar?: boolean
  cardCols?: string
}) {
  return (
    <>
      <PageHeaderSkeleton withAction={withAction} />
      <div className="mt-header-gap space-y-6">
        {withToolbar && <SkeletonToolbar />}
        {variant === 'list' && <SkeletonList />}
        {variant === 'cards' && <SkeletonCardGrid cols={cardCols} />}
        {variant === 'table' && <SkeletonTable />}
        {variant === 'detail' && <SkeletonDetail />}
        {variant === 'dashboard' && (
          <>
            <div className="flex gap-10">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton variant="text" width={48} height={28} />
                  <Skeleton variant="text" width={96} height={12} />
                </div>
              ))}
            </div>
            <SkeletonList count={3} />
          </>
        )}
      </div>
    </>
  )
}

// Pre-built skeleton for note cards
export function NoteCardSkeleton() {
  return (
    <div className="bg-champagne-50 border border-champagne-200 rounded-lg p-4 space-y-3">
      {/* Header: Avatar + Name + Date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-1.5">
            <Skeleton variant="text" width={120} height={14} />
            <Skeleton variant="text" width={80} height={12} />
          </div>
        </div>
        <Skeleton variant="rectangular" width={24} height={24} />
      </div>

      {/* Title */}
      <Skeleton variant="text" width="60%" height={18} />

      {/* Content lines */}
      <div className="space-y-2">
        <Skeleton variant="text" width="100%" height={14} />
        <Skeleton variant="text" width="90%" height={14} />
        <Skeleton variant="text" width="75%" height={14} />
      </div>

      {/* Footer: Badge + Tags */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton variant="rectangular" width={70} height={22} className="rounded-full" />
        <div className="flex gap-2">
          <Skeleton variant="rectangular" width={50} height={22} className="rounded-full" />
          <Skeleton variant="rectangular" width={60} height={22} className="rounded-full" />
        </div>
      </div>
    </div>
  )
}

// Skeleton list for loading state
export function NoteListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <NoteCardSkeleton key={index} />
      ))}
    </div>
  )
}
