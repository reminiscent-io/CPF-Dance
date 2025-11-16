import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireInstructor()
    
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('studios')
      .select('*')
      .order('name', { ascending: true })

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: studios, error } = await query

    if (error) {
      console.error('Error fetching studios:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ studios })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireInstructor()
    
    const supabase = await createClient()

    const body = await request.json()
    
    const {
      name,
      address,
      city,
      state,
      zip_code,
      contact_email,
      contact_phone,
      notes
    } = body

    const { data: studio, error } = await supabase
      .from('studios')
      .insert({
        name,
        address,
        city,
        state,
        zip_code,
        contact_email,
        contact_phone,
        notes
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating studio:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ studio }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
