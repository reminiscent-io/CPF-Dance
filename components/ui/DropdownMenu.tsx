'use client'

import React, { useState, useRef, useEffect, createContext, useContext, useCallback } from 'react'

interface DropdownContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  close: () => void
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

function useDropdownContext() {
  const context = useContext(DropdownContext)
  if (!context) {
    throw new Error('DropdownMenu components must be used within a DropdownMenu')
  }
  return context
}

export interface DropdownMenuProps {
  children: React.ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setIsOpen(false), [])

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, close])

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, close }}>
      <div ref={containerRef} className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

export interface DropdownMenuTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

export function DropdownMenuTrigger({
  children,
  className = '',
  asChild = false
}: DropdownMenuTriggerProps) {
  const { isOpen, setIsOpen } = useDropdownContext()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      'aria-expanded': isOpen,
      'aria-haspopup': 'menu'
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      className={className}
    >
      {children}
    </button>
  )
}

export interface DropdownMenuContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'end'
}

export function DropdownMenuContent({
  children,
  className = '',
  align = 'end'
}: DropdownMenuContentProps) {
  const { isOpen } = useDropdownContext()
  const contentRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Get all focusable menu items
  const getMenuItems = useCallback(() => {
    if (!contentRef.current) return []
    return Array.from(
      contentRef.current.querySelectorAll('[role="menuitem"]:not([disabled])')
    ) as HTMLElement[]
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1)
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const items = getMenuItems()
      if (items.length === 0) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setFocusedIndex(prev => (prev + 1) % items.length)
          break
        case 'ArrowUp':
          event.preventDefault()
          setFocusedIndex(prev => (prev - 1 + items.length) % items.length)
          break
        case 'Home':
          event.preventDefault()
          setFocusedIndex(0)
          break
        case 'End':
          event.preventDefault()
          setFocusedIndex(items.length - 1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, getMenuItems])

  // Focus the item at focusedIndex
  useEffect(() => {
    if (focusedIndex >= 0) {
      const items = getMenuItems()
      items[focusedIndex]?.focus()
    }
  }, [focusedIndex, getMenuItems])

  if (!isOpen) return null

  const alignClass = align === 'start' ? 'left-0' : 'right-0'

  return (
    <div
      ref={contentRef}
      role="menu"
      aria-orientation="vertical"
      className={`
        absolute z-50 mt-1 min-w-[160px] rounded-md border border-gray-200
        bg-white py-1 shadow-lg
        ${alignClass}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  destructive?: boolean
}

export function DropdownMenuItem({
  children,
  onClick,
  disabled = false,
  className = '',
  destructive = false
}: DropdownMenuItemProps) {
  const { close } = useDropdownContext()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onClick?.()
    close()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(e as any)
    }
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      className={`
        w-full px-3 py-2 text-left text-sm
        focus:outline-none focus:bg-gray-100
        ${disabled
          ? 'text-gray-400 cursor-not-allowed'
          : destructive
            ? 'text-red-600 hover:bg-red-50'
            : 'text-gray-700 hover:bg-gray-100'
        }
        ${className}
      `}
    >
      {children}
    </button>
  )
}

export interface DropdownMenuSeparatorProps {
  className?: string
}

export function DropdownMenuSeparator({ className = '' }: DropdownMenuSeparatorProps) {
  return <div className={`my-1 h-px bg-gray-200 ${className}`} role="separator" />
}
