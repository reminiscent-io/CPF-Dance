'use client'

import React from 'react'
import { Sidebar } from './Sidebar'
import type { Profile } from '@/lib/auth/types'

export interface PortalLayoutProps {
  children: React.ReactNode
  profile: Profile | null
}

export function PortalLayout({ children, profile }: PortalLayoutProps) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />
      
      <div className="flex-1 flex flex-col">
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>

        <footer className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-sm text-gray-600">
              <p>&copy; {currentYear} Reminiscent Technologies LLC. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
