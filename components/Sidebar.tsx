'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import type { Profile } from '@/lib/auth/types'
import {
  ChartBarIcon,
  CalendarIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  MusicalNoteIcon,
  DocumentIcon,
  PhotoIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

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
    if (pathname.startsWith('/admin')) return 'admin'
    if (pathname.startsWith('/instructor')) return 'instructor'
    if (pathname.startsWith('/dancer')) return 'dancer'
    return 'instructor'
  }

  const getNavigationLinks = () => {
    if (!profile) return { ungrouped: [], groups: [] }

    const instructorNav = {
      ungrouped: [
        { href: '/instructor', label: 'Dashboard', icon: <ChartBarIcon className="w-4 h-4" /> }
      ],
      groups: [
        {
          label: 'Schedule',
          links: [
            { href: '/instructor/schedule', label: 'Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
            { href: '/instructor/classes', label: 'Classes', icon: <AcademicCapIcon className="w-4 h-4" /> },
            { href: '/instructor/assets', label: 'Assets', icon: <PhotoIcon className="w-4 h-4" /> }
          ]
        },
        {
          label: 'Dancers',
          links: [
            { href: '/instructor/notes', label: 'Notes', icon: <DocumentTextIcon className="w-4 h-4" /> },
            { href: '/instructor/students', label: 'Students', icon: <UserGroupIcon className="w-4 h-4" /> }
          ]
        },
        {
          label: 'Payments',
          links: [
            { href: '/instructor/payments', label: 'Earnings', icon: <CreditCardIcon className="w-4 h-4" /> },
            { href: '/instructor/payments/invoices', label: 'Invoices', icon: <DocumentIcon className="w-4 h-4" /> }
          ]
        },
        {
          label: 'Admin',
          links: [
            { href: '/instructor/studios', label: 'Studios', icon: <BuildingOfficeIcon className="w-4 h-4" /> },
            { href: '/instructor/waivers', label: 'Waivers', icon: <ClipboardDocumentCheckIcon className="w-4 h-4" /> }
          ]
        }
      ]
    }

    const dancerNav = {
      ungrouped: [
        { href: '/dancer', label: 'Dashboard', icon: <ChartBarIcon className="w-4 h-4" /> }
      ],
      groups: [
        {
          label: 'Feedback',
          links: [
            { href: '/dancer/notes', label: 'Notes', icon: <DocumentTextIcon className="w-4 h-4" /> }
          ]
        },
        {
          label: 'Schedule',
          links: [
            { href: '/dancer/schedule', label: 'My Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
            { href: '/dancer/classes', label: 'My Classes', icon: <AcademicCapIcon className="w-4 h-4" /> }
          ]
        },
        {
          label: 'Book',
          links: [
            { href: '/dancer/request-lesson', label: 'Private Lessons', icon: <SparklesIcon className="w-4 h-4" /> },
            { href: '/dancer/available-classes', label: 'Open Classes', icon: <MagnifyingGlassIcon className="w-4 h-4" /> }
          ]
        },
        {
          label: 'Other',
          links: [
            { href: '/dancer/waivers', label: 'Waivers', icon: <ClipboardDocumentCheckIcon className="w-4 h-4" /> },
            { href: '/dancer/payments', label: 'Payments', icon: <CreditCardIcon className="w-4 h-4" /> }
          ]
        }
      ]
    }

    const adminNav = {
      ungrouped: [
        { href: '/admin', label: 'Dashboard', icon: <ChartBarIcon className="w-4 h-4" /> }
      ],
      groups: [
        {
          label: 'Management',
          links: [
            { href: '/admin/users', label: 'All Users', icon: <UsersIcon className="w-4 h-4" /> },
            { href: '/admin/instructor-requests', label: 'Instructors', icon: <AcademicCapIcon className="w-4 h-4" /> },
            { href: '/admin/studio-inquiries', label: 'Inquiries', icon: <ChatBubbleLeftRightIcon className="w-4 h-4" /> }
          ]
        }
      ]
    }

    if (profile.role === 'admin') {
      const portal = getCurrentPortal()
      switch (portal) {
        case 'admin':
          return adminNav
        case 'instructor':
          return instructorNav
        case 'dancer':
          return dancerNav
      }
    }

    switch (profile.role) {
      case 'instructor':
        return instructorNav
      case 'dancer':
      case 'guardian':
        return dancerNav
      default:
        return { ungrouped: [], groups: [] }
    }
  }

  const navLinks = getNavigationLinks()
  const portalOptions = [
    { value: 'admin', label: 'Admin', href: '/admin' },
    { value: 'instructor', label: 'Instructor', href: '/instructor' },
    { value: 'dancer', label: 'Dancer', href: '/dancer' },
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
      default:
        return '#'
    }
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

  if (!mounted) {
    return (
      <aside className="fixed top-0 left-0 h-screen w-64 bg-rose-800 text-white shadow-lg z-50 -translate-x-full md:static md:relative md:translate-x-0 md:h-screen">
        <div className="flex flex-col h-full">
          <div className="px-4 py-1 md:p-6 border-b border-rose-500 h-10 md:h-auto flex items-center md:block">
            <span className="text-2xl font-bold text-white">CPF Dance</span>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-40 md:hidden" style={{ display: isOpen ? 'block' : 'none' }} onClick={() => setIsOpen(false)} />
      
      <aside className={`
        fixed top-0 left-0 h-screen w-64 bg-rose-800 text-white shadow-lg z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:static md:relative md:translate-x-0 md:h-screen
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-1 md:p-6 border-b border-rose-500 h-10 md:h-auto flex items-center md:block">
            <Link href={profile ? `/${profile.role === 'guardian' ? 'dancer' : profile.role === 'admin' ? 'instructor' : profile.role}` : '/'} className="flex items-center justify-between w-full">
              <span className="text-2xl font-bold text-white">
                CPF Dance
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="md:hidden p-2 hover:bg-rose-700 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <XMarkIcon className="w-5 h-5" />
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
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {/* Ungrouped Items (Dashboard) */}
            {navLinks.ungrouped?.map((link: any) => {
              const isExactMatch = pathname === link.href
              const isSubpage = pathname?.startsWith(link.href + '/') && link.label !== 'Dashboard'
              const isActive = isExactMatch || isSubpage

              return (
                <button
                  key={link.href}
                  onClick={() => {
                    setIsOpen(false)
                    router.push(link.href)
                  }}
                  className={`
                    w-full text-left flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all
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

            {/* Grouped Items */}
            {navLinks.groups?.map((group: any, groupIndex: number) => (
              <div key={group.label} className={groupIndex > 0 || navLinks.ungrouped?.length > 0 ? 'mt-4' : ''}>
                {/* Group Header */}
                <div className="px-4 mb-1.5">
                  <div className="text-xs font-semibold text-rose-200 uppercase tracking-wider pb-1 border-b border-rose-500/50" style={{ fontFamily: 'var(--font-family-sans)' }}>
                    {group.label}
                  </div>
                </div>

                {/* Group Links */}
                <div className="space-y-1">
                  {group.links.map((link: any) => {
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
                            onClick={() => {
                              toggleParent(link.label)
                              if (link.href) {
                                setIsOpen(false)
                                router.push(link.href)
                              }
                            }}
                            className={`
                              w-full text-left flex items-center justify-between px-4 py-2 rounded-lg font-medium text-sm transition-all
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
                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          {isExpanded && (
                            <div className="space-y-1 pl-4 mt-1">
                              {link.children.map((child: any) => {
                                const childExactMatch = pathname === child.href
                                const childSubpage = pathname?.startsWith(child.href + '/') && child.label !== 'Overview'
                                const childIsActiveItem = childExactMatch || childSubpage
                                return (
                                  <button
                                    key={child.href}
                                    onClick={() => {
                                      setIsOpen(false)
                                      router.push(child.href)
                                    }}
                                    className={`
                                      w-full text-left flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all
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
                          w-full text-left flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all
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
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-rose-500 p-4">
            <button
              onClick={() => {
                setIsOpen(false)
                router.push(getProfileUrl())
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-rose-700/50 hover:bg-rose-700 border border-rose-500/50 hover:border-rose-400 transition-all group"
            >
              {/* Avatar circle or photo */}
              <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-400 transition-colors overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-sm">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile?.full_name}</p>
                <p className="text-xs text-rose-200 capitalize">
                  {profile?.role}
                </p>
              </div>
              {/* Chevron indicator */}
              <svg className="w-4 h-4 text-rose-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

    </>
  )
}
