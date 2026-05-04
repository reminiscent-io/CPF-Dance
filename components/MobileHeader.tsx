'use client'

import React from 'react'

export interface MobileHeaderProps {
  title?: string
  onMenuToggle: () => void
}

export function MobileHeader({ title = 'CPF Dance', onMenuToggle }: MobileHeaderProps) {
  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 z-30 bg-champagne-50 border-b border-champagne-200 h-10 flex items-center px-4"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 0px)',
        height: 'calc(2.5rem + env(safe-area-inset-top))'
      }}
    >
      <button
        onClick={onMenuToggle}
        className="p-2 hover:bg-champagne-100 rounded-lg transition-colors mr-4"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 className="text-lg text-charcoal-950 truncate" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h1>
    </div>
  )
}
