'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import type { Profile } from '@/lib/auth/types'

export interface SidebarProps {
  profile: Profile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

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
            { href: '/dancer/classes', label: 'My Classes', icon: '🎓' },
            { href: '/dancer/notes', label: 'Notes', icon: '📝' },
            { href: '/dancer/request-lesson', label: 'Request Lesson', icon: '🎯' },
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
          { href: '/dancer/classes', label: 'My Classes', icon: '🎓' },
          { href: '/dancer/notes', label: 'Notes', icon: '📝' },
          { href: '/dancer/request-lesson', label: 'Request Lesson', icon: '🎯' },
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
          <div className="p-6 border-b border-rose-500">
            <Link href={profile ? `/${profile.role === 'guardian' ? 'dancer' : profile.role === 'admin' ? 'instructor' : profile.role}` : '/'} className="flex items-center justify-between">
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
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    block px-4 py-3 rounded-lg font-medium text-sm transition-all
                    ${isActive
                      ? 'bg-rose-400 text-white shadow-md'
                      : 'text-rose-100 hover:bg-white hover:bg-opacity-10'
                    }
                  `}
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-rose-500 p-6 space-y-4">
            <Link
              href={getProfileUrl()}
              onClick={() => setIsOpen(false)}
              className="block hover:opacity-90 transition-opacity"
            >
              <p className="text-sm font-semibold text-white">{profile?.full_name}</p>
              <p className="text-xs text-rose-200 capitalize">
                {profile?.role}
              </p>
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-lg font-medium text-sm text-white transition-colors"
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

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed bottom-6 right-6 z-40 p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg transition-colors"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  )
}
