export type UserRole = 'instructor' | 'dancer' | 'guardian' | 'admin'

export interface Profile {
  id: string
  email: string | null
  phone: string | null
  full_name: string
  role: UserRole
  avatar_url: string | null
  date_of_birth: string | null
  guardian_id: string | null
  consent_given: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface AuthError {
  message: string
  field?: string
}
