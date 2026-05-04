'use client'

import React, { useEffect, useRef } from 'react'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md'
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
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
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'sm:max-w-md max-w-[calc(100%-1.5rem)]',
    md: 'sm:max-w-lg max-w-[calc(100%-1.5rem)]',
    lg: 'sm:max-w-2xl max-w-[calc(100%-1.5rem)]',
    xl: 'sm:max-w-4xl max-w-[calc(100%-1.5rem)]'
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm animate-fadeIn"
      style={{
        backgroundColor: 'rgba(10, 10, 10, 0.5)',
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 56px), 68px)', // Account for bottom nav (40px) + safe area + padding
        paddingLeft: 'max(env(safe-area-inset-left), 12px)',
        paddingRight: 'max(env(safe-area-inset-right), 12px)'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={containerRef}
        className={`
          bg-champagne-50 rounded-lg shadow-soft-lg w-full ${sizes[size]}
          animate-slideUp
          max-h-full flex flex-col
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-champagne-200 flex-shrink-0">
            <h2 id="modal-title" className="text-xl sm:text-2xl font-semibold text-charcoal-950">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-charcoal-400 hover:text-charcoal-700 transition-colors ml-4"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}

export interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`flex items-center justify-end gap-3 pt-4 border-t border-champagne-200 ${className}`}>
      {children}
    </div>
  )
}
