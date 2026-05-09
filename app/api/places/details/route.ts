import { NextRequest, NextResponse } from 'next/server'

interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

function parseAddressComponents(components: AddressComponent[]) {
  let street = ''
  let city = ''
  let state = ''
  let zip = ''

  for (const component of components) {
    if (component.types.includes('street_number')) {
      street = component.long_name + ' ' + street
    }
    if (component.types.includes('route')) {
      street = street + component.long_name
    }
    if (component.types.includes('locality')) {
      city = component.long_name
    }
    if (component.types.includes('administrative_area_level_1')) {
      state = component.short_name // Use abbreviation (e.g., "CA" instead of "California")
    }
    if (component.types.includes('postal_code')) {
      zip = component.long_name
    }
  }

  return {
    address: street.trim(),
    city,
    state,
    zip_code: zip
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication to prevent API quota abuse
    const { getCurrentUserWithRole } = await import('@/lib/auth/server-auth')
    const profile = await getCurrentUserWithRole()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { placeId } = await request.json()

    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.error('Google Places API key not configured')
      return NextResponse.json(
        { error: 'Places API not configured' },
        { status: 500 }
      )
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', placeId)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('fields', 'address_components,formatted_address,geometry')

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error('Google Places API error')
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.result) {
      console.error('Google Places details error:', data.status, data.error_message)
      throw new Error('Invalid place result')
    }

    const details = parseAddressComponents(data.result.address_components || [])

    return NextResponse.json({ details })
  } catch (error) {
    console.error('Places details error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    )
  }
}
