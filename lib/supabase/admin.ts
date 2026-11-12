import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Service-role client — bypasses RLS. Only call from trusted server contexts
// (API routes that have already verified the caller's authorization).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'createAdminClient requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
