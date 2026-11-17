'use client'

import { useEffect, useRef, useState } from 'react'
import posthog from 'posthog-js'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from './types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const identifiedUserId = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // This is the client auth boundary: identify an existing session on page
    // load and auth transitions so errors and events inherit the Supabase UUID.
    const syncPostHogIdentity = (nextUser: User | null) => {
      if (!nextUser) {
        if (identifiedUserId.current) {
          posthog.reset()
          identifiedUserId.current = null
        }
        return
      }

      if (identifiedUserId.current === nextUser.id) return

      if (identifiedUserId.current) {
        posthog.reset()
      }

      const personProperties: Record<string, string> = {}
      if (nextUser.email) personProperties.email = nextUser.email
      if (typeof nextUser.user_metadata.full_name === 'string') {
        personProperties.name = nextUser.user_metadata.full_name
      }
      if (typeof nextUser.user_metadata.role === 'string') {
        personProperties.role = nextUser.user_metadata.role
      }

      posthog.identify(nextUser.id, personProperties)
      identifiedUserId.current = nextUser.id
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      syncPostHogIdentity(sessionUser)

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
            setProfile(profileData as Profile)
          }
          setLoading(false)
        }
        fetchProfile().catch(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      syncPostHogIdentity(sessionUser)

      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profileData }) => {
            setProfile(profileData as Profile | null)
          })
      } else {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, profile, loading }
}
