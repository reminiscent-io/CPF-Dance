import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasInstructorPrivileges } from '@/lib/auth/privileges'

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and instructors can fetch profiles
    if (!hasInstructorPrivileges(profile)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const roleFilter = searchParams.get('role')

    let query = supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true })

    if (roleFilter) {
      // If filtering for instructors, include admins too (they can also teach)
      if (roleFilter === 'instructor') {
        query = query.in('role', ['instructor', 'admin'])
      } else {
        query = query.eq('role', roleFilter)
      }
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('Error fetching profiles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
