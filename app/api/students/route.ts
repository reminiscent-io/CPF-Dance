import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireInstructor()
    
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')

    let query = supabase
      .from('students')
      .select(`
        *,
        profile:profiles!students_profile_id_fkey(full_name, email, phone, date_of_birth),
        guardian:profiles!students_guardian_id_fkey(full_name, email, phone)
      `)
      .order('created_at', { ascending: false })

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.or(`profile.full_name.ilike.%${search}%`)
    }

    const { data: students, error } = await query

    if (error) {
      console.error('Error fetching students:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ students })
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
      profile_id,
      guardian_id,
      age_group,
      skill_level,
      goals,
      medical_notes,
      emergency_contact_name,
      emergency_contact_phone,
      full_name,
      email,
      phone
    } = body

    let studentProfileId = profile_id

    if (!profile_id && full_name) {
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          full_name,
          email,
          phone,
          role: 'dancer'
        })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating profile:', profileError)
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }

      studentProfileId = newProfile.id
    }

    const { data: student, error } = await supabase
      .from('students')
      .insert({
        profile_id: studentProfileId,
        guardian_id,
        age_group,
        skill_level,
        goals,
        medical_notes,
        emergency_contact_name,
        emergency_contact_phone
      })
      .select(`
        *,
        profile:profiles!students_profile_id_fkey(full_name, email, phone, date_of_birth),
        guardian:profiles!students_guardian_id_fkey(full_name, email, phone)
      `)
      .single()

    if (error) {
      console.error('Error creating student:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ student }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
