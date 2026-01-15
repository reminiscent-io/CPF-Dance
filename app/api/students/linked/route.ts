import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireInstructor()
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const excludeId = searchParams.get('exclude')

    // Get students with linked profiles (verified dancer accounts)
    let query = supabase
      .from('students')
      .select(`
        id,
        profile:profiles!students_profile_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .not('profile_id', 'is', null)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Exclude specific student if provided (the source student being merged)
    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data: students, error } = await query

    if (error) {
      console.error('Error fetching linked students:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ students: students || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
