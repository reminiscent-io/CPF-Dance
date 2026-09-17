import { createClient } from '@/lib/supabase/server'
import { hasAdminPrivileges, hasDancerPrivileges, hasInstructorPrivileges } from './privileges'
import type { UserRole } from './types'

export type { UserRole }

export interface ProfileWithRole {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: UserRole
  date_of_birth: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  linked_profile_id?: string | null
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

  // Check if this profile is linked to a primary profile
  if (profile.linked_profile_id) {
    // Fetch the primary profile
    const { data: primaryProfile, error: primaryError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.linked_profile_id)
      .single()

    // If primary profile exists, use it instead
    if (!primaryError && primaryProfile) {
      return primaryProfile as ProfileWithRole
    }

    // If primary profile fetch failed, fall back to current profile
    console.warn(`Linked profile ${profile.linked_profile_id} not found for user ${user.id}`)
  }

  return profile as ProfileWithRole
}

// Uses the same privilege helpers as the proxy and the portal pages, so admins
// pass every guard and guardians pass dancer guards.
function satisfiesRole(profile: ProfileWithRole, role: UserRole): boolean {
  switch (role) {
    case 'admin':
      return hasAdminPrivileges(profile)
    case 'instructor':
      return hasInstructorPrivileges(profile)
    case 'dancer':
      return hasDancerPrivileges(profile)
    case 'guardian':
      return profile.role === 'guardian' || hasAdminPrivileges(profile)
  }
}

export async function requireRole(role: UserRole): Promise<ProfileWithRole> {
  const profile = await getCurrentUserWithRole()

  if (!profile) {
    throw new Error('Unauthorized: No authenticated user')
  }

  if (!satisfiesRole(profile, role)) {
    throw new Error(`Forbidden: Requires ${role} role, but user has ${profile.role} role`)
  }

  return profile
}

export async function getCurrentDancerStudent() {
  const supabase = await createClient()
  const profile = await requireRole('dancer')

  // Guardians act for the student linked through students.guardian_id (RLS
  // grants them the same access). There's no student picker yet, so a guardian
  // with several students always gets the oldest record.
  if (profile.role === 'guardian') {
    const { data: student } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('guardian_id', profile.id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (student) {
      return student
    }
    throw new Error('Student record not found for this user')
  }

  // Dancers (and admins) use their own student record
  const { data: student, error } = await supabase
    .from('students')
    .select('id, profile_id')
    .eq('profile_id', profile.id)
    .single()

  if (!error && student) {
    return student
  }

  // SECURITY: Admins accessing dancer routes must have their own student record.
  // Previously this returned the first arbitrary student, allowing admin impersonation.
  throw new Error('Student record not found for this user')
}

export async function requireInstructor(): Promise<ProfileWithRole> {
  return requireRole('instructor')
}

export async function requireDancer(): Promise<ProfileWithRole> {
  return requireRole('dancer')
}

// The dancer portal is operationally single-instructor. Dancer flows
// (private-lesson requests, lesson-pack checkout) used to take an
// `instructor_id` from the client; they now resolve it server-side via
// this helper. Reads `public_profiles` because migration 38 restricts
// dancers from reading instructor PII off the `profiles` table.
// Multi-instructor case: deterministic — lowest UUID wins.
export async function getDefaultInstructorId(): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('public_profiles')
    .select('id')
    .eq('role', 'instructor')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to look up default instructor: ${error.message}`)
  }
  if (!data) {
    throw new Error('No instructor profile found')
  }
  return data.id
}

