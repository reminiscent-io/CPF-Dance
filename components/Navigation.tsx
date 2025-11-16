'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import type { Profile } from '@/lib/auth/types'

export interface NavigationProps {
  profile: Profile | null
}

export function Navigation({ profile }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const getNavigationLinks = () => {
    if (!profile) return []

    switch (profile.role) {
      case 'instructor':
        return [
          { href: '/instructor', label: 'Dashboard' },
          { href: '/instructor/schedule', label: 'Schedule' },
          { href: '/instructor/students', label: 'Students' },
          { href: '/instructor/classes', label: 'Classes' },
        ]
      case 'dancer':
      case 'guardian':
        return [
          { href: '/dancer', label: 'Dashboard' },
          { href: '/dancer/classes', label: 'My Classes' },
          { href: '/dancer/notes', label: 'Notes' },
          { href: '/dancer/request-lesson', label: 'Request Lesson' },
          { href: '/dancer/payments', label: 'Payments' },
          { href: '/dancer/profile', label: 'Profile' },
        ]
      case 'studio_admin':
        return [
          { href: '/studio', label: 'Dashboard' },
          { href: '/studio/instructors', label: 'Instructors' },
          { href: '/studio/students', label: 'Students' },
          { href: '/studio/reports', label: 'Reports' },
        ]
      default:
        return []
    }
  }

  const navLinks = getNavigationLinks()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href={profile ? `/${profile.role === 'guardian' ? 'dancer' : profile.role}` : '/'} className="flex items-center">
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
            <div className="text-sm text-gray-700">
              <span className="font-medium">{profile?.full_name}</span>
              <span className="text-gray-500 ml-2 capitalize">
                ({profile?.role === 'studio_admin' ? 'Studio Admin' : profile?.role})
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Sign Out
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
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-sm text-gray-500 capitalize">
                  {profile?.role === 'studio_admin' ? 'Studio Admin' : profile?.role}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
