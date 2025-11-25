'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import type { Profile } from '@/lib/auth/types'

export interface SidebarProps {
  profile: Profile | null
  isOpen?: boolean
  setIsOpen?: (isOpen: boolean) => void
}

export function Sidebar({ profile, isOpen: controlledIsOpen, setIsOpen: controlledSetIsOpen }: SidebarProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set(['Schedule']))
  const pathname = usePathname()
  const router = useRouter()
  
  // Use controlled or internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = controlledSetIsOpen || setInternalIsOpen

  // Initialize sidebar state from localStorage and screen size (only for uncontrolled mode)
  useEffect(() => {
    if (controlledIsOpen === undefined) {
      const isMobile = window.innerWidth < 768
      const savedState = localStorage.getItem('sidebar-open')
      
      // On mobile, default to closed. On desktop, default to open (unless user saved preference)
      if (savedState !== null) {
        setIsOpen(JSON.parse(savedState))
      } else {
        setIsOpen(!isMobile)
      }
    }
    setMounted(true)
  }, [controlledIsOpen, setIsOpen])

  // Persist sidebar state to localStorage (only for uncontrolled mode)
  useEffect(() => {
    if (mounted && controlledIsOpen === undefined) {
      localStorage.setItem('sidebar-open', JSON.stringify(isOpen))
    }
  }, [isOpen, mounted, controlledIsOpen])

  const getCurrentPortal = () => {
    if (!pathname) return 'instructor'
    if (pathname.startsWith('/instructor')) return 'instructor'
    if (pathname.startsWith('/dancer')) return 'dancer'
    if (pathname.startsWith('/studio')) return 'studio'
    return 'instructor'
  }

  const getNavigationLinks = () => {
    if (!profile) return []

    if (profile.role === 'admin') {
      const portal = getCurrentPortal()
      switch (portal) {
        case 'instructor':
          return [
            { href: '/instructor', label: 'Dashboard', icon: '📊' },
            { href: '/instructor/schedule', label: 'Schedule', icon: '📅' },
            { href: '/instructor/students', label: 'Students', icon: '👥' },
            { href: '/instructor/classes', label: 'Classes', icon: '🎓' },
            { href: '/instructor/studios', label: 'Studios', icon: '🏢' },
            { href: '/instructor/waivers', label: 'Waivers', icon: '📋' },
            { href: '/instructor/payments', label: 'Payments', icon: '💳' },
          ]
        case 'dancer':
          return [
            { href: '/dancer', label: 'Dashboard', icon: '📊' },
            {
              label: 'Schedule',
              icon: '📅',
              children: [
                { href: '/dancer/classes', label: 'My Classes', icon: '🎓' },
                { href: '/dancer/available-classes', label: 'Available Classes', icon: '🔍' },
                { href: '/dancer/request-lesson', label: 'Private Lessons', icon: '🎯' },
              ]
            },
            { href: '/dancer/notes', label: 'Notes', icon: '📝' },
            { href: '/dancer/waivers', label: 'Waivers', icon: '📋' },
            { href: '/dancer/payments', label: 'Payments', icon: '💳' },
          ]
        case 'studio':
          return [
            { href: '/studio', label: 'Dashboard', icon: '📊' },
            { href: '/studio/schedule', label: 'Schedule', icon: '📅' },
            { href: '/studio/classes', label: 'Classes', icon: '🎓' },
            { href: '/studio/students', label: 'Students', icon: '👥' },
            { href: '/studio/waivers', label: 'Waivers', icon: '📋' },
            { href: '/studio/payments', label: 'Payments', icon: '💳' },
          ]
      }
    }

    switch (profile.role) {
      case 'instructor':
        return [
          { href: '/instructor', label: 'Dashboard', icon: '📊' },
          { href: '/instructor/schedule', label: 'Schedule', icon: '📅' },
          { href: '/instructor/students', label: 'Students', icon: '👥' },
          { href: '/instructor/classes', label: 'Classes', icon: '🎓' },
          { href: '/instructor/studios', label: 'Studios', icon: '🏢' },
          { href: '/instructor/waivers', label: 'Waivers', icon: '📋' },
          { href: '/instructor/payments', label: 'Payments', icon: '💳' },
        ]
      case 'dancer':
      case 'guardian':
        return [
          { href: '/dancer', label: 'Dashboard', icon: '📊' },
          {
            label: 'Schedule',
            icon: '📅',
            children: [
              { href: '/dancer/classes', label: 'My Classes', icon: '🎓' },
              { href: '/dancer/available-classes', label: 'Available Classes', icon: '🔍' },
              { href: '/dancer/request-lesson', label: 'Private Lessons', icon: '🎯' },
            ]
          },
          { href: '/dancer/notes', label: 'Notes', icon: '📝' },
          { href: '/dancer/waivers', label: 'Waivers', icon: '📋' },
          { href: '/dancer/payments', label: 'Payments', icon: '💳' },
        ]
      case 'studio_admin':
        return [
          { href: '/studio', label: 'Dashboard', icon: '📊' },
          { href: '/studio/schedule', label: 'Schedule', icon: '📅' },
          { href: '/studio/classes', label: 'Classes', icon: '🎓' },
          { href: '/studio/students', label: 'Students', icon: '👥' },
          { href: '/studio/waivers', label: 'Waivers', icon: '📋' },
          { href: '/studio/payments', label: 'Payments', icon: '💳' },
        ]
      default:
        return []
    }
  }

  const navLinks = getNavigationLinks()
  const portalOptions = [
    { value: 'instructor', label: 'Instructor', href: '/instructor' },
    { value: 'dancer', label: 'Dancer', href: '/dancer' },
    { value: 'studio', label: 'Studio', href: '/studio' },
  ]

  const getProfileUrl = () => {
    if (!profile) return '#'
    if (profile.role === 'admin') {
      const portal = getCurrentPortal()
      return `/${portal}/profile`
    }
    switch (profile.role) {
      case 'dancer':
      case 'guardian':
        return '/dancer/profile'
      case 'instructor':
        return '/instructor/profile'
      case 'studio':
        return '/studio/profile'
      default:
        return '#'
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const toggleParent = (label: string) => {
    const newExpanded = new Set(expandedParents)
    if (newExpanded.has(label)) {
      newExpanded.delete(label)
    } else {
      newExpanded.add(label)
    }
    setExpandedParents(newExpanded)
  }

  const isChildActive = (children: any[] | undefined) => {
    if (!children) return false
    return children.some(child => pathname === child.href || pathname?.startsWith(child.href + '/'))
  }

  return (
    <>
      <div className="fixed inset-0 z-40 md:hidden" style={{ display: isOpen ? 'block' : 'none' }} onClick={() => setIsOpen(false)} />
      
      <aside className={`
        fixed top-0 left-0 h-screen w-64 bg-gradient-to-br from-rose-600 to-mauve-600 text-white shadow-lg z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:static md:relative md:translate-x-0 md:h-screen
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 md:p-6 border-b border-rose-500 h-16 md:h-auto flex items-center md:block">
            <Link href={profile ? `/${profile.role === 'guardian' ? 'dancer' : profile.role === 'admin' ? 'instructor' : profile.role}` : '/'} className="flex items-center justify-between w-full">
              <span className="text-2xl font-bold text-white">
                Dance Studio
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="md:hidden p-2 hover:bg-rose-700 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Link>
          </div>

          {/* Admin Portal Switcher */}
          {profile?.role === 'admin' && (
            <div className="px-6 py-4 border-b border-rose-500">
              <label className="block text-xs text-rose-100 font-medium uppercase tracking-wide mb-2">
                Switch Portal
              </label>
              <select
                value={getCurrentPortal()}
                onChange={(e) => {
                  router.push(portalOptions.find(p => p.value === e.target.value)?.href || '/instructor')
                  setIsOpen(false)
                }}
                className="w-full text-sm font-medium bg-rose-700 border border-rose-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                {portalOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} Portal
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            {navLinks.map((link: any) => {
              const hasChildren = link.children && link.children.length > 0
              const isExpanded = expandedParents.has(link.label)
              const childIsActive = isChildActive(link.children)
              const isExactMatch = pathname === link.href
              const isSubpage = pathname?.startsWith(link.href + '/') && link.label !== 'Dashboard'
              const isActive = isExactMatch || isSubpage

              if (hasChildren) {
                return (
                  <div key={link.label}>
                    <button
                      onClick={() => toggleParent(link.label)}
                      className={`
                        w-full text-left flex items-center justify-between px-4 py-3 rounded-lg font-medium text-sm transition-all
                        ${childIsActive
                          ? 'bg-rose-400 text-white shadow-md'
                          : 'text-rose-100 hover:bg-white hover:bg-opacity-10'
                        }
                      `}
                    >
                      <span className="flex items-center">
                        <span className="mr-3">{link.icon}</span>
                        {link.label}
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="space-y-1 pl-4 mt-1">
                        {link.children.map((child: any) => {
                          const childExactMatch = pathname === child.href
                          const childSubpage = pathname?.startsWith(child.href + '/') && child.label !== 'Dashboard'
                          const childIsActiveItem = childExactMatch || childSubpage
                          return (
                            <button
                              key={child.href}
                              onClick={() => {
                                setIsOpen(false)
                                router.push(child.href)
                              }}
                              className={`
                                w-full text-left flex items-center px-4 py-3 rounded-lg font-medium text-sm transition-all
                                ${childIsActiveItem
                                  ? 'bg-rose-400 text-white shadow-md'
                                  : 'text-rose-100 hover:bg-white hover:bg-opacity-10'
                                }
                              `}
                            >
                              <span className="mr-3">{child.icon}</span>
                              {child.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <button
                  key={link.href}
                  onClick={() => {
                    setIsOpen(false)
                    router.push(link.href)
                  }}
                  className={`
                    w-full text-left block px-4 py-3 rounded-lg font-medium text-sm transition-all
                    ${isActive
                      ? 'bg-rose-400 text-white shadow-md'
                      : 'text-rose-100 hover:bg-white hover:bg-opacity-10'
                    }
                  `}
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.label}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-rose-500 p-6 space-y-4">
            <button
              onClick={() => {
                setIsOpen(false)
                router.push(getProfileUrl())
              }}
              className="w-full text-left block hover:opacity-90 transition-opacity"
            >
              <p className="text-sm font-semibold text-white">{profile?.full_name}</p>
              <p className="text-xs text-rose-200 capitalize">
                {profile?.role}
              </p>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-rose-100 hover:bg-white hover:bg-opacity-10 transition-colors"
              aria-label="Sign Out"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

    </>
  )
}
