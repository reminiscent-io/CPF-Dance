import { NextRequest, NextResponse } from 'next/server'

interface AddressComponent {
  long_name: string
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
      state = component.long_name
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

    const response = await fetch(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          key: apiKey,
          fields: 'address_component,formatted_address,geometry'
        })
      }
    )

    if (!response.ok) {
      throw new Error('Google Places API error')
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.result) {
      throw new Error('Invalid place result')
    }

    const details = parseAddressComponents(data.result.address_components || [])
    details.address = data.result.formatted_address || details.address

    return NextResponse.json({ details })
  } catch (error) {
    console.error('Places details error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    )
  }
}
