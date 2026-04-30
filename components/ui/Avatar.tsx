'use client'

import React, { useState } from 'react'

export interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

// Two-tone Ballet Noir avatar background. Champagne paper for most names,
// Stage Rose Soft for the rest, so a feed of Courtney + dancer initials
// reads with quiet differentiation rather than uniform sameness.
function getAvatarTone(name: string): { bg: string; text: string } {
  const useRose = hashName(name) % 2 === 1
  return useRose
    ? { bg: 'bg-ballet-pink-100', text: 'text-ballet-pink-800' }
    : { bg: 'bg-champagne-200', text: 'text-charcoal-700' }
}

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
  const tone = getAvatarTone(name || alt || 'User')
  const initials = getInitials(name || alt || 'User')

  return (
    <div
      className={`
        ${sizes[size]}
        rounded-full flex items-center justify-center flex-shrink-0
        ${showImage ? 'bg-champagne-100' : tone.bg}
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
        <span className={`font-medium ${tone.text}`}>
          {initials}
        </span>
      )}
    </div>
  )
}

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
    <span className={`font-medium text-charcoal-700 ${className}`}>
      {children}
    </span>
  )
}
