import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
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

    const response = await fetch(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: query,
          key: apiKey,
          components: 'country:us'
        })
      }
    )

    if (!response.ok) {
      throw new Error('Google Places API error')
    }

    const data = await response.json()
    
    return NextResponse.json({
      predictions: data.predictions || []
    })
  } catch (error) {
    console.error('Places search error:', error)
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    )
  }
}
