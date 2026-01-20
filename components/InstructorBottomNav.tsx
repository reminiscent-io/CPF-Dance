'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  CalendarIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  UserGroupIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
}

export function InstructorBottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const navItems: NavItem[] = [
    {
      id: 'schedule',
      label: 'Schedule',
      icon: <CalendarIcon className="w-5 h-5" />,
      href: '/instructor/schedule'
    },
    {
      id: 'classes',
      label: 'Classes',
      icon: <AcademicCapIcon className="w-5 h-5" />,
      href: '/instructor/classes'
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      href: '/instructor/notes'
    },
    {
      id: 'students',
      label: 'Students',
      icon: <UserGroupIcon className="w-5 h-5" />,
      href: '/instructor/students'
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
    router.push('/instructor/notes?create=true')
  }

  const handleCreateClass = () => {
    setShowPlusMenu(false)
    router.push('/instructor/classes?create=true')
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
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setShowPlusMenu(false)}
        />
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
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
                  ? 'text-rose-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          ))}

          {/* Center plus button */}
          <div className="relative flex-1 flex justify-center" ref={menuRef}>
            <button
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all transform -translate-y-3 ${
                showPlusMenu
                  ? 'bg-gray-700 rotate-45'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
              aria-label={showPlusMenu ? 'Close menu' : 'Quick actions'}
              aria-expanded={showPlusMenu}
            >
              <PlusIcon className="w-5 h-5 text-white transition-transform" />
            </button>

            {/* Popup menu */}
            {showPlusMenu && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden min-w-[200px] animate-slideUp">
                <button
                  onClick={handleAddNote}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="block font-medium text-gray-900">Add Note</span>
                    <span className="block text-xs text-gray-500">Create a student note</span>
                  </div>
                </button>
                <button
                  onClick={handleCreateClass}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <AcademicCapIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="block font-medium text-gray-900">Create Class</span>
                    <span className="block text-xs text-gray-500">Schedule a new class</span>
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
                  ? 'text-rose-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
