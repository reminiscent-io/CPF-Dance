import { NextResponse } from 'next/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import type { createAdminClient } from '@/lib/supabase/admin'

// Voice notes upload from the browser into the private `voice-notes` bucket
// (migration 56), get transcribed by POST /api/voice-to-notes, and are deleted
// as soon as that finishes. Nothing else reads the bucket.

export const VOICE_NOTE_BUCKET = 'voice-notes'
// OpenAI Whisper's limit, and the bucket's.
export const VOICE_NOTE_MAX_BYTES = 25 * 1024 * 1024
// The bucket accepts only this type. Whisper reads the recording as WebM
// whatever the browser labelled it, as it always has.
export const VOICE_NOTE_CONTENT_TYPE = 'audio/webm'
// A recording older than this was abandoned mid-flow (closed tab, lost signal).
const STALE_MS = 60 * 60 * 1000

type Profile = NonNullable<Awaited<ReturnType<typeof getCurrentUserWithRole>>>
type AdminClient = ReturnType<typeof createAdminClient>

export function voiceNoteFolder(profileId: string): string {
  return `${profileId}/`
}

/** Who may record a voice note: dancers, instructors and admins, once OPENAI_API_KEY is set. */
export async function authorizeVoiceNote(): Promise<{ profile: Profile; apiKey: string } | { response: NextResponse }> {
  const profile = await getCurrentUserWithRole()
  if (!profile) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!['dancer', 'instructor', 'admin'].includes(profile.role)) {
    return {
      response: NextResponse.json(
        { error: 'Voice notes are only available for dancers and instructors' },
        { status: 403 }
      ),
    }
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      response: NextResponse.json(
        { error: 'Voice notes feature is not configured. Please contact support.' },
        { status: 503 }
      ),
    }
  }
  return { profile, apiKey }
}

/** Deletes this profile's recordings that never got transcribed. Best effort: a failure only logs. */
export async function sweepStaleVoiceNotes(admin: AdminClient, profileId: string, now = Date.now()): Promise<void> {
  try {
    const { data, error } = await admin.storage.from(VOICE_NOTE_BUCKET).list(profileId, { limit: 100 })
    if (error) throw error
    const stale = (data ?? [])
      .filter((file) => file.created_at && now - Date.parse(file.created_at) > STALE_MS)
      .map((file) => `${voiceNoteFolder(profileId)}${file.name}`)
    if (stale.length > 0) await admin.storage.from(VOICE_NOTE_BUCKET).remove(stale)
  } catch (error) {
    console.error('Could not sweep old voice notes:', error)
  }
}
