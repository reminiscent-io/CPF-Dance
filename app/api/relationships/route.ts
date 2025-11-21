import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - List all relationships (admin only)
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

    // Get all relationships with instructor and student details
    const { data, error } = await supabase
      .from('instructor_student_relationships')
      .select(`
        id,
        instructor_id,
        student_id,
        relationship_status,
        can_view_notes,
        can_view_progress,
        can_view_payments,
        started_at,
        instructor:profiles!instructor_student_relationships_instructor_id_fkey(id, full_name, email),
        student:students!instructor_student_relationships_student_id_fkey(
          id,
          profile:profiles!students_profile_id_fkey(id, full_name, email)
        )
      `)
      .order('started_at', { ascending: false })

    if (error) {
      console.error('Error fetching relationships:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in relationships GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new relationship (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { instructor_id, student_id, can_view_notes = true, can_view_progress = true, can_view_payments = false } = body

    // Validate input
    if (!instructor_id || !student_id) {
      return NextResponse.json({ error: 'instructor_id and student_id are required' }, { status: 400 })
    }

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

    // Verify instructor exists and has instructor role
    const { data: instructor } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', instructor_id)
      .single()

    if (!instructor || instructor.role !== 'instructor') {
      return NextResponse.json({ error: 'Invalid instructor ID' }, { status: 400 })
    }

    // Verify student exists
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', student_id)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 })
    }

    // Create relationship
    const { data, error } = await supabase
      .from('instructor_student_relationships')
      .insert({
        instructor_id,
        student_id,
        relationship_status: 'active',
        can_view_notes,
        can_view_progress,
        can_view_payments,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate relationship
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Relationship already exists' }, { status: 409 })
      }
      console.error('Error creating relationship:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('Error in relationships POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove relationship (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const relationshipId = searchParams.get('id')

    if (!relationshipId) {
      return NextResponse.json({ error: 'Relationship ID is required' }, { status: 400 })
    }

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

    // Delete relationship
    const { error } = await supabase
      .from('instructor_student_relationships')
      .delete()
      .eq('id', relationshipId)

    if (error) {
      console.error('Error deleting relationship:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in relationships DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
