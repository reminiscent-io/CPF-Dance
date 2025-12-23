'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import type { Profile } from '@/lib/auth/types'

export interface PortalLayoutProps {
  children: React.ReactNode
  profile: Profile | null
}

export function PortalLayout({ children, profile }: PortalLayoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const currentYear = new Date().getFullYear()

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

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden portal-content">
      <MobileHeader onMenuToggle={handleToggleSidebar} />
      <Sidebar profile={profile} isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex-1 flex flex-col overflow-hidden pt-12 md:pt-0">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>

        <footer className="bg-white border-t border-gray-200 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="text-center text-sm text-gray-600">
              <p>&copy; {currentYear} CPF Dance LLC. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
