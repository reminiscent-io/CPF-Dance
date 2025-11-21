import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - List all instructors (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all profiles with instructor or admin role
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['instructor', 'admin'])
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Error fetching instructors:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ instructors: data })
  } catch (error) {
    console.error('Error in instructors GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
