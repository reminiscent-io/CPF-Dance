/**
 * Waiver Access Control Helper
 *
 * This module documents and helps enforce waiver access control rules:
 *
 * WHO CAN VIEW A WAIVER:
 * 1. The issuer (instructor/admin who created it)
 * 2. Admins (can view all waivers)
 * 3. The recipient (student/studio who received it)
 * 4. The signer (person who signed it, may differ from recipient)
 * 5. Guardian of the student recipient
 *
 * WHO CAN UPDATE A WAIVER:
 * 1. The issuer (to modify status, expiration, etc.)
 * 2. The recipient (to decline or accept)
 * 3. Admins (full access)
 *
 * NOTE: Most access control is enforced at the database level via RLS policies.
 * These helpers are for API-level validation and documentation.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface WaiverAccessContext {
  userId: string
  waiverId: string
  supabase: SupabaseClient
}

/**
 * Check if a user can view a specific waiver
 * Note: This is redundant with RLS policies but useful for explicit checks
 */
export async function canViewWaiver(context: WaiverAccessContext): Promise<boolean> {
  const { userId, waiverId, supabase } = context

  // Get the waiver
  const { data: waiver, error } = await supabase
    .from('waivers')
    .select('issued_by_id, recipient_id, signed_by_id')
    .eq('id', waiverId)
    .single()

  if (error || !waiver) {
    return false
  }

  // Check if user is issuer, recipient, or signer
  if (
    waiver.issued_by_id === userId ||
    waiver.recipient_id === userId ||
    waiver.signed_by_id === userId
  ) {
    return true
  }

  // Check if user is an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'admin') {
    return true
  }

  // Check if user is a guardian of the recipient
  const { data: student } = await supabase
    .from('students')
    .select('guardian_id')
    .eq('profile_id', waiver.recipient_id)
    .single()

  if (student?.guardian_id === userId) {
    return true
  }

  // Check if user's profile has a guardian relationship
  const { data: recipientProfile } = await supabase
    .from('profiles')
    .select('guardian_id')
    .eq('id', waiver.recipient_id)
    .single()

  if (recipientProfile?.guardian_id === userId) {
    return true
  }

  return false
}

/**
 * Check if a user can update a specific waiver
 */
export async function canUpdateWaiver(context: WaiverAccessContext): Promise<boolean> {
  const { userId, waiverId, supabase } = context

  // Get the waiver
  const { data: waiver, error } = await supabase
    .from('waivers')
    .select('issued_by_id, recipient_id')
    .eq('id', waiverId)
    .single()

  if (error || !waiver) {
    return false
  }

  // Check if user is issuer or recipient
  if (waiver.issued_by_id === userId || waiver.recipient_id === userId) {
    return true
  }

  // Check if user is an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'admin') {
    return true
  }

  return false
}

/**
 * Get all waivers visible to a user (including as guardian)
 * This is mainly for documentation - the actual filtering is done by RLS
 */
export async function getVisibleWaivers(userId: string, supabase: SupabaseClient) {
  // RLS policies will automatically filter, so we just query all waivers
  // The database will return only those the user can access
  const { data: waivers, error } = await supabase
    .from('waivers')
    .select('*')
    .order('created_at', { ascending: false })

  return { waivers: waivers || [], error }
}
