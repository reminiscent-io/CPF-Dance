import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudioAdmin } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const profile = await requireStudioAdmin()
    const supabase = await createClient()

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: profileData })
  } catch (error) {
    console.error('Error in studio profile GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await requireStudioAdmin()
    const supabase = await createClient()

    const body = await request.json()
    const { full_name, phone, date_of_birth } = body

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        full_name,
        phone: phone || null,
        date_of_birth: date_of_birth || null
      })
      .eq('id', profile.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: updatedProfile })
  } catch (error) {
    console.error('Error in studio profile PUT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
