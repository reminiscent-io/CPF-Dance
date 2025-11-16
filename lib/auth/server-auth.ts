import { createClient } from '@/lib/supabase/server'

export type UserRole = 'instructor' | 'dancer' | 'studio_admin'

export interface ProfileWithRole {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: UserRole
  date_of_birth: string | null
  created_at: string
  updated_at: string
}

export async function getCurrentUserWithRole(): Promise<ProfileWithRole | null> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    return null
  }
  
  return profile as ProfileWithRole
}

export async function requireRole(role: UserRole): Promise<ProfileWithRole> {
  const profile = await getCurrentUserWithRole()
  
  if (!profile) {
    throw new Error('Unauthorized: No authenticated user')
  }
  
  if (profile.role !== role) {
    throw new Error(`Forbidden: Requires ${role} role, but user has ${profile.role} role`)
  }
  
  return profile
}

export async function getCurrentDancerStudent() {
  const supabase = await createClient()
  const profile = await requireRole('dancer')
  
  const { data: student, error } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', profile.id)
    .single()
  
  if (error || !student) {
    throw new Error('Student record not found for this dancer')
  }
  
  return student
}

export async function requireInstructor(): Promise<ProfileWithRole> {
  return requireRole('instructor')
}

export async function requireDancer(): Promise<ProfileWithRole> {
  return requireRole('dancer')
}

export async function requireStudioAdmin(): Promise<ProfileWithRole> {
  return requireRole('studio_admin')
}
