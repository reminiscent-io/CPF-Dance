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
  const baseClass = 'animate-pulse bg-gray-200'

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

// Pre-built skeleton for note cards
export function NoteCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
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
