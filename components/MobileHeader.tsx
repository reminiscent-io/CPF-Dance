'use client'

import React from 'react'

export interface MobileHeaderProps {
  title?: string
  onMenuToggle: () => void
}

export function MobileHeader({ title = 'CPF Dance', onMenuToggle }: MobileHeaderProps) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4">
      <button
        onClick={onMenuToggle}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-4"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
    </div>
  )
}
