'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { SignUpData, SignInData, UserRole } from './types'

export async function signIn(data: SignInData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      const roleRedirects: Record<UserRole, string> = {
        instructor: '/instructor',
        dancer: '/dancer',
        studio: '/studio',
        studio_admin: '/studio',
        guardian: '/dancer',
        admin: '/instructor',
      }
      redirect(roleRedirects[profile.role as UserRole] || '/dancer')
    }
  }

  redirect('/dancer')
}

export async function signUp(data: SignUpData) {
  const supabase = await createClient()

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (signUpError) {
    return { error: signUpError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user account' }
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email: data.email,
    phone: data.phone || null,
    full_name: data.fullName,
    role: data.role,
    date_of_birth: data.dateOfBirth || null,
    consent_given: false,
  })

  if (profileError) {
    return { error: 'Failed to create profile: ' + profileError.message }
  }

  if (data.role === 'dancer') {
    const { error: studentError } = await supabase.from('students').insert({
      profile_id: authData.user.id,
      is_active: true,
    })

    if (studentError) {
      console.error('Failed to create student record:', studentError)
    }
  }

  const roleRedirects: Record<UserRole, string> = {
    instructor: '/instructor',
    dancer: '/dancer',
    studio: '/studio',
    studio_admin: '/studio',
    guardian: '/dancer',
    admin: '/instructor',
  }

  redirect(roleRedirects[data.role] || '/dancer')
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign out error:', error)
    return { error: error.message }
  }

  redirect('/login')
}

export async function updateProfile(updates: {
  full_name?: string
  phone?: string
  avatar_url?: string
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
