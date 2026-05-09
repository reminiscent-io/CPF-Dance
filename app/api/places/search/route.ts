import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'

export async function POST(request: NextRequest) {
  try {
    // Require authentication to prevent API quota abuse
    const profile = await getCurrentUserWithRole()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query } = await request.json()

    if (!query || query.length < 3) {
      return NextResponse.json({ predictions: [] })
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.error('Google Places API key not configured')
      return NextResponse.json(
        { error: 'Places API not configured' },
        { status: 500 }
      )
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', query)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('components', 'country:us')

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error('Google Places API error')
    }

    const data = await response.json()

    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places autocomplete error:', data.status, data.error_message)
      return NextResponse.json({ predictions: [] })
    }

    const predictions = (data.predictions || []).map((p: any) => ({
      place_id: p.place_id,
      main_text: p.structured_formatting?.main_text ?? p.description,
      secondary_text: p.structured_formatting?.secondary_text ?? '',
      description: p.description,
    }))

    return NextResponse.json({ predictions })
  } catch (error) {
    console.error('Places search error:', error)
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    )
  }
}
