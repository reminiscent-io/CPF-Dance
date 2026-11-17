import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUploadTarget } from '@/lib/storage/direct-upload'
import {
  authorizeVoiceNote,
  sweepStaleVoiceNotes,
  VOICE_NOTE_BUCKET,
  VOICE_NOTE_MAX_BYTES,
  voiceNoteFolder,
} from '@/lib/voice-notes'

// POST /api/voice-to-notes/upload-url - Where the browser should send a recording.
// Body: { size }. Then POST /api/voice-to-notes with { path }.
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeVoiceNote()
    if ('response' in auth) return auth.response

    const body = await request.json().catch(() => null)
    if (typeof body?.size === 'number' && body.size > VOICE_NOTE_MAX_BYTES) {
      return NextResponse.json({ error: 'Audio file too large. Maximum size is 25MB.' }, { status: 400 })
    }

    const admin = createAdminClient()
    await sweepStaleVoiceNotes(admin, auth.profile.id)
    const path = `${voiceNoteFolder(auth.profile.id)}${crypto.randomUUID()}.webm`
    const target = await createUploadTarget(admin, VOICE_NOTE_BUCKET, path)
    return NextResponse.json({ target })
  } catch (error) {
    console.error('Error in POST /api/voice-to-notes/upload-url:', error)
    return NextResponse.json({ error: 'Failed to process voice note. Please try again.' }, { status: 500 })
  }
}
