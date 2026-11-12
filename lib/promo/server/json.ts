import type { Json } from '@/lib/supabase/database.types'

/**
 * Promo documents, brand tokens and tags are plain JSON by construction, but
 * their interfaces carry no index signature, so TypeScript won't accept them
 * for a jsonb column. This is the one place that says so.
 */
export function toJson(value: object): Json {
  return value as Json
}
