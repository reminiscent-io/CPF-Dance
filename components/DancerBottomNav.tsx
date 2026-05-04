'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  CalendarIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  PlusIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
}

export function DancerBottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const navItems: NavItem[] = [
    {
      id: 'notes',
      label: 'Notes',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      href: '/dancer/notes'
    },
    {
      id: 'privates',
      label: 'Privates',
      icon: <SparklesIcon className="w-5 h-5" />,
      href: '/dancer/request-lesson'
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <CalendarIcon className="w-5 h-5" />,
      href: '/dancer/schedule'
    },
    {
      id: 'classes',
      label: 'Classes',
      icon: <AcademicCapIcon className="w-5 h-5" />,
      href: '/dancer/classes'
    }
  ]

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false)
      }
    }

    if (showPlusMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPlusMenu])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowPlusMenu(false)
      }
    }

    if (showPlusMenu) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showPlusMenu])

  const handleNavClick = (href: string) => {
    router.push(href)
  }

  const handleAddNote = () => {
    setShowPlusMenu(false)
    router.push('/dancer/notes?create=true')
  }

  const handleFindClass = () => {
    setShowPlusMenu(false)
    router.push('/dancer/available-classes')
  }

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  // Split nav items for left and right of center button
  const leftItems = navItems.slice(0, 2)
  const rightItems = navItems.slice(2)

  return (
    <>
      {/* Overlay when menu is open */}
      {showPlusMenu && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: 'rgba(10, 10, 10, 0.35)', backdropFilter: 'blur(2px)' }}
          onClick={() => setShowPlusMenu(false)}
        />
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-champagne-50 border-t border-champagne-200 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-10 px-2 relative">
          {/* Left nav items */}
          {leftItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.href)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive(item.href)
                  ? 'text-rose-700'
                  : 'text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1" style={{ fontWeight: 500, letterSpacing: '0.04em' }}>{item.label}</span>
            </button>
          ))}

          {/* Center plus button */}
          <div className="relative flex-1 flex justify-center" ref={menuRef}>
            <button
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all transform -translate-y-3 shadow-soft ${
                showPlusMenu
                  ? 'bg-charcoal-700 rotate-45'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
              aria-label={showPlusMenu ? 'Close menu' : 'Quick actions'}
              aria-expanded={showPlusMenu}
            >
              <PlusIcon className="w-5 h-5 text-champagne-50 transition-transform" />
            </button>

            {/* Popup menu */}
            {showPlusMenu && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-champagne-50 rounded-lg shadow-soft-lg border border-champagne-200 overflow-hidden min-w-[200px] animate-slideUp">
                <button
                  onClick={handleAddNote}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-champagne-100 transition-colors border-b border-champagne-200"
                >
                  <div className="w-9 h-9 rounded-full bg-champagne-100 border border-champagne-200 flex items-center justify-center">
                    <DocumentTextIcon className="w-5 h-5 text-charcoal-700" />
                  </div>
                  <div>
                    <span className="block text-charcoal-950" style={{ fontWeight: 500 }}>Add note</span>
                    <span className="block text-xs text-charcoal-500">Write in your journal</span>
                  </div>
                </button>
                <button
                  onClick={handleFindClass}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-champagne-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center">
                    <AcademicCapIcon className="w-5 h-5 text-rose-700" />
                  </div>
                  <div>
                    <span className="block text-charcoal-950" style={{ fontWeight: 500 }}>Find a class</span>
                    <span className="block text-xs text-charcoal-500">Browse available classes</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Right nav items */}
          {rightItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.href)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive(item.href)
                  ? 'text-rose-700'
                  : 'text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1" style={{ fontWeight: 500, letterSpacing: '0.04em' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
