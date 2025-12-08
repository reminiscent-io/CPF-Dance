/**
 * Privilege Helper System
 * 
 * This module provides centralized role-checking functions for consistent
 * authorization across the codebase. The admin role has universal access
 * to all functionality.
 * 
 * Key principle: Admin users can perform any action that instructors,
 * dancers, or studio admins can perform.
 */

import type { UserRole } from './types'

interface ProfileLike {
  role: UserRole | string
}

/**
 * Check if user has instructor-level privileges (instructor or admin).
 * Use for protecting instructor-only features like class management,
 * student management, notes, payments, etc.
 */
export function hasInstructorPrivileges(profile: ProfileLike | null | undefined): boolean {
  if (!profile) return false
  return profile.role === 'instructor' || profile.role === 'admin'
}

export function hasDancerPrivileges(profile: ProfileLike | null | undefined): boolean {
  if (!profile) return false
  return profile.role === 'dancer' || profile.role === 'guardian' || profile.role === 'admin'
}

export function hasAdminPrivileges(profile: ProfileLike | null | undefined): boolean {
  if (!profile) return false
  return profile.role === 'admin'
}

export function canAccessInstructorPortal(profile: ProfileLike | null | undefined): boolean {
  return hasInstructorPrivileges(profile)
}

export function canAccessDancerPortal(profile: ProfileLike | null | undefined): boolean {
  return hasDancerPrivileges(profile)
}

export function canManageClasses(profile: ProfileLike | null | undefined): boolean {
  return hasInstructorPrivileges(profile)
}

export function canManageStudents(profile: ProfileLike | null | undefined): boolean {
  return hasInstructorPrivileges(profile)
}

export function canManagePayments(profile: ProfileLike | null | undefined): boolean {
  return hasInstructorPrivileges(profile)
}

export function canManageNotes(profile: ProfileLike | null | undefined): boolean {
  return hasInstructorPrivileges(profile)
}

export function canManageStudios(profile: ProfileLike | null | undefined): boolean {
  return hasInstructorPrivileges(profile)
}

export function canManageWaivers(profile: ProfileLike | null | undefined): boolean {
  return hasInstructorPrivileges(profile)
}

export function isInstructorOrAdmin(role: UserRole | string | undefined): boolean {
  return role === 'instructor' || role === 'admin'
}

export function isDancerOrAdmin(role: UserRole | string | undefined): boolean {
  return role === 'dancer' || role === 'guardian' || role === 'admin'
}
