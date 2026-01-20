'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { InstructorBottomNav } from './InstructorBottomNav'
import { DancerBottomNav } from './DancerBottomNav'
import type { Profile } from '@/lib/auth/types'

export interface PortalLayoutProps {
  children: React.ReactNode
  profile: Profile | null
}

export function PortalLayout({ children, profile }: PortalLayoutProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const currentYear = new Date().getFullYear()

  // Determine which portal we're in based on the current path
  const isInstructorPortal = pathname?.startsWith('/instructor')
  const isDancerPortal = pathname?.startsWith('/dancer')

  // Initialize sidebar state from localStorage and screen size
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    const savedState = localStorage.getItem('sidebar-open')
    
    // On mobile, default to closed. On desktop, default to open (unless user saved preference)
    if (savedState !== null) {
      setIsOpen(JSON.parse(savedState))
    } else {
      setIsOpen(!isMobile)
    }
    setMounted(true)
  }, [])

  // Persist sidebar state to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebar-open', JSON.stringify(isOpen))
    }
  }, [isOpen, mounted])

  const handleToggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  if (!mounted) {
    return (
      <div className="h-[100dvh] bg-gray-50 flex flex-col md:flex-row overflow-hidden portal-content">
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 h-10"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 0px)',
            height: 'calc(2.5rem + env(safe-area-inset-top))'
          }}
        />
        <aside className="hidden md:block fixed top-0 left-0 h-[100dvh] w-64 bg-gradient-to-br from-rose-600 to-mauve-600 text-white shadow-lg z-50 md:static md:relative md:translate-x-0 md:h-[100dvh]">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-rose-500">
              <span className="text-2xl font-bold text-white">CPF Dance</span>
            </div>
          </div>
        </aside>
        <div
          className="flex-1 flex flex-col overflow-hidden pt-10 md:pt-0"
          style={{
            paddingTop: 'calc(2.5rem + env(safe-area-inset-top))'
          }}
        >
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col md:flex-row overflow-hidden portal-content">
      <MobileHeader onMenuToggle={handleToggleSidebar} />
      <Sidebar profile={profile} isOpen={isOpen} setIsOpen={setIsOpen} />

      <div
        className="flex-1 flex flex-col overflow-hidden pt-10 md:pt-0"
        style={{
          paddingTop: 'calc(2.5rem + env(safe-area-inset-top))', // 2.5rem = 40px mobile header height
        }}
      >
        <main className="flex-1 overflow-y-auto md:pt-0">
          <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${
            profile?.role ? 'pb-24 md:pb-8' : ''
          }`}>
            {children}
          </div>
        </main>

        <footer
          className="bg-white border-t border-gray-200 flex-shrink-0 hidden md:block"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="text-center text-sm text-gray-600">
              <p>&copy; {currentYear} CPF Dance LLC. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Bottom nav based on current portal path */}
      {isInstructorPortal && <InstructorBottomNav />}
      {isDancerPortal && <DancerBottomNav />}
    </div>
  )
}
