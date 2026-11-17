import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPathUnder } from '@/lib/storage/direct-upload'
import {
  authorizeVoiceNote,
  VOICE_NOTE_BUCKET,
  VOICE_NOTE_CONTENT_TYPE,
  VOICE_NOTE_MAX_BYTES,
  voiceNoteFolder,
} from '@/lib/voice-notes'

// Dance-specific prompt for cleaning transcriptions
const DANCE_CLEANING_PROMPT = `You are a dance note-taker. Clean up this spoken note lightly: fix grammar, punctuation, and capitalization, but keep the original wording and meaning as much as possible.

Preserve dance terms exactly as spoken, including:
- Ballet terms: plié, chassé, port de bras, épaulement, tendu, relevé, développé, arabesque, attitude, échappé, glissade, assemblé, brisé, fouetté, pirouette, grand jeté, sauté, ballonné, fondu, rond de jambe, battement, adagio, allegro, barre, centre
- General dance terms: across the floor, combination, counts, musicality, phrasing, transition, alignment, turnout, pointe, soft shoe, character, contemporary, jazz, ballet, modern, hip-hop
- Technical terms: spotting, relevé, demi, full, petit, grand

Format rules:
- If the note mentions a combination or sequence of steps, preserve the order exactly
- If counts or music phrasing are mentioned, keep them exactly as spoken
- Use simple HTML formatting: <p> for paragraphs, <strong> for emphasis, <ul>/<li> for lists
- Keep it concise - do not add explanations or summaries
- Do not add any text that wasn't in the original

Return ONLY the cleaned HTML content, no markdown, no explanations.`

// Lets the recorder disable itself before anyone records a note that can't be
// transcribed.
export async function GET() {
  const profile = await getCurrentUserWithRole()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ configured: Boolean(process.env.OPENAI_API_KEY) })
}

// Body: { path }, from POST /api/voice-to-notes/upload-url. The recording went
// straight to Storage (Vercel caps request bodies at 4.5 MB); it's read back
// here and deleted once this request ends, whatever the outcome.
export async function POST(request: NextRequest) {
  let admin: ReturnType<typeof createAdminClient> | null = null
  let recordingPath: string | null = null
  try {
    const auth = await authorizeVoiceNote()
    if ('response' in auth) return auth.response

    const body = await request.json().catch(() => null)
    if (!isPathUnder(body?.path, voiceNoteFolder(auth.profile.id))) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }
    recordingPath = body.path as string
    admin = createAdminClient()

    const { data: audioBlob, error: downloadError } = await admin.storage
      .from(VOICE_NOTE_BUCKET)
      .download(recordingPath)
    if (downloadError || !audioBlob) {
      return NextResponse.json(
        { error: 'The recording didn’t arrive. Please try again.' },
        { status: 400 }
      )
    }

    // Validate file size (max 25MB - OpenAI Whisper limit)
    if (audioBlob.size > VOICE_NOTE_MAX_BYTES) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey: auth.apiKey })

    // Whisper picks the decoder from the file name.
    const file = new File([await audioBlob.arrayBuffer()], 'audio.webm', { type: VOICE_NOTE_CONTENT_TYPE })

    // Step 1: Transcribe audio using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text'
    })

    const rawTranscript = transcription as unknown as string

    if (!rawTranscript || rawTranscript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not transcribe audio. Please try speaking more clearly.' },
        { status: 400 }
      )
    }

    // Step 2: Clean and format with GPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective for this task
      messages: [
        {
          role: 'system',
          content: DANCE_CLEANING_PROMPT
        },
        {
          role: 'user',
          content: rawTranscript
        }
      ],
      temperature: 0.3, // Low temperature for more literal output
      max_tokens: 1000
    })

    const cleanedContent = completion.choices[0]?.message?.content || rawTranscript

    // Ensure content is wrapped in paragraph tags if it isn't already
    let html = cleanedContent.trim()
    if (!html.startsWith('<')) {
      html = `<p>${html}</p>`
    }

    return NextResponse.json({
      html,
      success: true
    })

  } catch (error) {
    console.error('Voice-to-notes error:', error)

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'Voice notes feature is not properly configured.' },
          { status: 503 }
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment and try again.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process voice note. Please try again.' },
      { status: 500 }
    )
  } finally {
    if (admin && recordingPath) {
      const { error } = await admin.storage.from(VOICE_NOTE_BUCKET).remove([recordingPath])
      if (error) console.error('Could not delete voice note recording:', error)
    }
  }
}

// Download, Whisper and the cleanup pass together can take a while.
export const maxDuration = 60
