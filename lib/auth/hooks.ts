'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { syncAnalyticsUser } from '@/lib/analytics/posthog-client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from './types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Analytics gets the user once the profile row says which role they have.
    const applyProfile = (nextProfile: Profile | null) => {
      setProfile(nextProfile)
      if (nextProfile) syncAnalyticsUser({ id: nextProfile.id, role: nextProfile.role })
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        // Fetch profile data
        const fetchProfile = async () => {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (!error) {
            // The enum still carries studio and studio_admin; no profile uses them.
            applyProfile(profileData as Profile)
          }
          setLoading(false)
        }
        fetchProfile().catch(() => setLoading(false))
      } else {
        syncAnalyticsUser(null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profileData }) => {
            applyProfile(profileData as Profile | null)
          })
      } else {
        setProfile(null)
        syncAnalyticsUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, profile, loading }
}
