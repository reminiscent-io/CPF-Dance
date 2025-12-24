import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const profile = await requireInstructor()
    const supabase = await createClient()

    // Fetch the full profile data
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, date_of_birth, role')
      .eq('id', profile.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: profileData })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await requireInstructor()
    const supabase = await createClient()

    const body = await request.json()
    const { full_name, phone, date_of_birth } = body

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name,
        phone,
        date_of_birth
      })
      .eq('id', profile.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
