'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from './types'
import { getMockUserRole, getMockProfile } from './mock-profiles'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Use mock profiles instead of Supabase auth
    const mockRole = getMockUserRole()
    
    if (mockRole) {
      const mockProfile = getMockProfile(mockRole)
      setProfile(mockProfile)
      // Create a minimal mock user object
      setUser({ id: mockProfile?.id || '' } as User)
    }
    
    setLoading(false)
  }, [])

  return { user, profile, loading }
}
