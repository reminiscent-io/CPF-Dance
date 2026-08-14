'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { useSidebarOpen } from '@/lib/hooks/useSidebarOpen'
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
  const [isOpen, setIsOpen] = useSidebarOpen()

  // Determine which portal we're in based on the current path
  const isInstructorPortal = pathname?.startsWith('/instructor')
  const isDancerPortal = pathname?.startsWith('/dancer')

  const handleToggleSidebar = () => {
    setIsOpen(!isOpen)
  }


  return (
    <div className="h-[100dvh] bg-champagne-50 flex flex-col md:flex-row overflow-hidden portal-content">
      <MobileHeader onMenuToggle={handleToggleSidebar} />
      <Sidebar profile={profile} isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* 2.5rem = 40px mobile header height; md:pt-0 removes it once the sidebar takes over */}
      <div className="flex-1 flex flex-col overflow-hidden pt-[calc(2.5rem+env(safe-area-inset-top))] md:pt-0">
        <main className="flex-1 overflow-y-auto md:pt-0">
          <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-page-x pt-5 lg:pt-page-top ${
            profile?.role ? 'pb-24 md:pb-8' : 'pb-8'
          }`}>
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav based on current portal path */}
      {isInstructorPortal && <InstructorBottomNav />}
      {isDancerPortal && <DancerBottomNav />}
    </div>
  )
}
