import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import OpenAI from 'openai'

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

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated (dancer or instructor can use voice notes)
    const profile = await getCurrentUserWithRole()
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only dancers, instructors, and admins can use voice notes
    if (!['dancer', 'instructor', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Voice notes are only available for dancers and instructors' },
        { status: 403 }
      )
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Voice notes feature is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const openai = new OpenAI({ apiKey })

    // Get the audio file from form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 25MB - OpenAI Whisper limit)
    const maxSize = 25 * 1024 * 1024
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      )
    }

    // Convert File to proper format for OpenAI
    const audioBuffer = await audioFile.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type })

    // Create a File object that OpenAI can accept
    const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })

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
  }
}

// Route segment config for larger file uploads (25MB max for audio)
export const maxDuration = 60 // Allow up to 60 seconds for processing
