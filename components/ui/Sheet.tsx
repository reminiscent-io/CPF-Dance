'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

export interface SheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  /** Width of the panel on desktop. Mobile is always full-width. */
  size?: 'md' | 'lg'
}

/**
 * Right-anchored slide-over panel. Replaces the modal-as-first-thought pattern
 * for forms and edit flows. On viewports <640px the panel becomes full-screen
 * so dancers on phones get a route-like experience without losing context.
 */
export function Sheet({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
}: SheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useFocusTrap(containerRef, isOpen)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Track scroll position so the header can show a hairline shadow when the
  // body has scrolled away from the top. Wires through context for any
  // SheetBody nested inside.
  if (!isOpen) return null

  const widths = {
    md: 'sm:max-w-md',
    lg: 'sm:max-w-xl',
  }

  return (
    <ScrollContext.Provider value={{ onScroll: setScrolled, scrolled }}>
      <div
        className="fixed inset-0 z-[60] flex justify-end animate-fadeIn"
        style={{ backgroundColor: 'rgba(10, 10, 10, 0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        aria-describedby={description ? 'sheet-description' : undefined}
      >
        <div
          ref={containerRef}
          className={`
            relative w-full ${widths[size]}
            bg-champagne-50 shadow-soft-lg
            flex flex-col
            h-full sm:h-auto sm:rounded-lg sm:max-h-[calc(100vh-1.5rem)]
            animate-slideInRight
          `}
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 0px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
            marginTop: '0.75rem',
            marginRight: 'max(env(safe-area-inset-right), 0.75rem)',
            marginBottom: '0.75rem',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <div
              className={`
                flex items-start justify-between
                px-5 py-4 sm:px-6 sm:py-5
                border-b border-champagne-200
                flex-shrink-0
                transition-shadow duration-200
                ${scrolled ? 'shadow-[0_1px_0_var(--color-champagne-200)]' : ''}
              `}
            >
              <div className="flex-1 min-w-0 pr-4">
                {title && (
                  <h2
                    id="sheet-title"
                    className="text-2xl font-semibold text-charcoal-950 tracking-[-0.02em]"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="sheet-description" className="mt-1 text-sm text-charcoal-500">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 -mr-1 -mt-1 inline-flex items-center justify-center w-11 h-11 rounded-md text-charcoal-500 hover:text-charcoal-900 hover:bg-champagne-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div ref={bodyRef} className="contents">
            {children}
          </div>
        </div>
      </div>
    </ScrollContext.Provider>
  )
}

interface ScrollContextValue {
  onScroll: (scrolled: boolean) => void
  scrolled: boolean
}

const ScrollContext = React.createContext<ScrollContextValue | null>(null)

export interface SheetBodyProps {
  children: React.ReactNode
  className?: string
}

export function SheetBody({ children, className = '' }: SheetBodyProps) {
  const ctx = React.useContext(ScrollContext)

  return (
    <div
      className={`flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 ${className}`}
      onScroll={(e) => {
        if (!ctx) return
        const next = e.currentTarget.scrollTop > 4
        if (next !== ctx.scrolled) ctx.onScroll(next)
      }}
    >
      {children}
    </div>
  )
}

export interface SheetFooterProps {
  children: React.ReactNode
  className?: string
}

export function SheetFooter({ children, className = '' }: SheetFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 px-5 py-4 sm:px-6 border-t border-champagne-200 flex-shrink-0 ${className}`}
    >
      {children}
    </div>
  )
}
