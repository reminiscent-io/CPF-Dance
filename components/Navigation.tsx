'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import type { Profile } from '@/lib/auth/types'

export interface NavigationProps {
  profile: Profile | null
}

export function Navigation({ profile }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const getCurrentPortal = () => {
    if (!pathname) return 'instructor'
    if (pathname.startsWith('/instructor')) return 'instructor'
    if (pathname.startsWith('/dancer')) return 'dancer'
    if (pathname.startsWith('/studio')) return 'studio'
    return 'instructor' // default for admin
  }

  const getNavigationLinks = () => {
    if (!profile) return []

    // Admin role: show navigation based on current portal
    if (profile.role === 'admin') {
      const portal = getCurrentPortal()
      switch (portal) {
        case 'instructor':
          return [
            { href: '/instructor', label: 'Dashboard' },
            { href: '/instructor/schedule', label: 'Schedule' },
            { href: '/instructor/students', label: 'Students' },
            { href: '/instructor/classes', label: 'Classes' },
            { href: '/instructor/studios', label: 'Studios' },
            { href: '/instructor/payments', label: 'Payments' },
          ]
        case 'dancer':
          return [
            { href: '/dancer', label: 'Dashboard' },
            { href: '/dancer/classes', label: 'My Classes' },
            { href: '/dancer/notes', label: 'Notes' },
            { href: '/dancer/request-lesson', label: 'Request Lesson' },
            { href: '/dancer/payments', label: 'Payments' },
          ]
        case 'studio':
          return [
            { href: '/studio', label: 'Dashboard' },
            { href: '/studio/schedule', label: 'Schedule' },
            { href: '/studio/classes', label: 'Classes' },
            { href: '/studio/students', label: 'Students' },
            { href: '/studio/payments', label: 'Payments' },
          ]
      }
    }

    switch (profile.role) {
      case 'instructor':
        return [
          { href: '/instructor', label: 'Dashboard' },
          { href: '/instructor/schedule', label: 'Schedule' },
          { href: '/instructor/students', label: 'Students' },
          { href: '/instructor/classes', label: 'Classes' },
          { href: '/instructor/studios', label: 'Studios' },
          { href: '/instructor/payments', label: 'Payments' },
        ]
      case 'dancer':
      case 'guardian':
        return [
          { href: '/dancer', label: 'Dashboard' },
          { href: '/dancer/classes', label: 'My Classes' },
          { href: '/dancer/notes', label: 'Notes' },
          { href: '/dancer/request-lesson', label: 'Request Lesson' },
          { href: '/dancer/payments', label: 'Payments' },
        ]
      case 'studio_admin':
        return [
          { href: '/studio', label: 'Dashboard' },
          { href: '/studio/schedule', label: 'Schedule' },
          { href: '/studio/classes', label: 'Classes' },
          { href: '/studio/students', label: 'Students' },
          { href: '/studio/payments', label: 'Payments' },
        ]
      default:
        return []
    }
  }

  const navLinks = getNavigationLinks()

  const portalOptions = [
    { value: 'instructor', label: 'Instructor Portal', href: '/instructor' },
    { value: 'dancer', label: 'Dancer Portal', href: '/dancer' },
    { value: 'studio', label: 'Studio Portal', href: '/studio' },
  ]

  const getProfileUrl = () => {
    if (!profile) return '#'

    // Admin users: profile URL depends on current portal
    if (profile.role === 'admin') {
      const portal = getCurrentPortal()
      return `/${portal}/profile`
    }

    // Regular users: profile URL based on role
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
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href={profile ? `/${profile.role === 'guardian' ? 'dancer' : profile.role === 'admin' ? 'instructor' : profile.role}` : '/'} className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-mauve-600 bg-clip-text text-transparent">
                Dance Studio
              </span>
            </Link>

            <div className="hidden md:flex md:ml-10 md:space-x-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-rose-50 text-rose-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-4">
            {profile?.role === 'admin' && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Portal:</span>
                <select
                  value={getCurrentPortal()}
                  onChange={(e) => router.push(portalOptions.find(p => p.value === e.target.value)?.href || '/instructor')}
                  className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {portalOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Link
              href={getProfileUrl()}
              className="text-sm text-gray-700 hover:text-rose-600 transition-colors"
            >
              <span className="font-medium">{profile?.full_name}</span>
              <span className="text-gray-500 ml-2 capitalize">
                ({profile?.role})
              </span>
            </Link>
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-700 hover:text-rose-600 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    block px-3 py-2 rounded-md text-base font-medium transition-colors
                    ${isActive
                      ? 'bg-rose-50 text-rose-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
          <div className="border-t border-gray-200 px-4 py-3 space-y-3">
            {profile?.role === 'admin' && (
              <div>
                <label className="block text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                  Switch Portal
                </label>
                <select
                  value={getCurrentPortal()}
                  onChange={(e) => {
                    router.push(portalOptions.find(p => p.value === e.target.value)?.href || '/instructor')
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {portalOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Link
                href={getProfileUrl()}
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-rose-600 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-sm text-gray-500 capitalize">
                  {profile?.role}
                </p>
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-700 hover:text-rose-600 transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
