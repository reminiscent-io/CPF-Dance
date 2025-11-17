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
        id,
        profile_id,
        guardian_id,
        full_name,
        email,
        phone,
        age_group,
        skill_level,
        goals,
        medical_notes,
        emergency_contact_name,
        emergency_contact_phone,
        is_active,
        created_at,
        updated_at,
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

    // If no profile_id and no full_name, we can't create a student
    if (!profile_id && !full_name) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    // Create student record
    // If profile_id exists, student is linked to an authenticated dancer
    // If not, store contact info directly on student record until they sign up
    const { data: student, error } = await supabase
      .from('students')
      .insert({
        profile_id: profile_id || null,
        guardian_id,
        full_name: full_name || null,
        email: email || null,
        phone: phone || null,
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
