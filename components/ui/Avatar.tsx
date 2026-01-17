import React, { useState } from 'react'

export interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Generate a consistent color based on name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-rose-500',
    'bg-purple-500',
    'bg-blue-500',
    'bg-teal-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-indigo-500',
    'bg-pink-500',
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

// Get initials from a name (up to 2 characters)
function getInitials(name: string): string {
  if (!name) return '?'

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function Avatar({
  src,
  alt,
  name = '',
  size = 'md',
  className = ''
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  const showImage = src && !imageError
  const bgColor = getAvatarColor(name || alt || 'User')
  const initials = getInitials(name || alt || 'User')

  return (
    <div
      className={`
        ${sizes[size]}
        rounded-full flex items-center justify-center flex-shrink-0
        ${showImage ? 'bg-gray-100' : bgColor}
        ${className}
      `}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="w-full h-full rounded-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="font-medium text-white">
          {initials}
        </span>
      )}
    </div>
  )
}

// Sub-components for more granular control (optional pattern)
export function AvatarImage({ src, alt }: { src: string; alt?: string }) {
  return (
    <img
      src={src}
      alt={alt || 'Avatar'}
      className="w-full h-full rounded-full object-cover"
    />
  )
}

export function AvatarFallback({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={`font-medium text-white ${className}`}>
      {children}
    </span>
  )
}
