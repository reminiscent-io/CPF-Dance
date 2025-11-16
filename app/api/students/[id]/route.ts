import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInstructor()
    
    const supabase = await createClient()
    const { id } = await params

    const { data: student, error } = await supabase
      .from('students')
      .select(`
        *,
        profile:profiles!students_profile_id_fkey(full_name, email, phone, date_of_birth),
        guardian:profiles!students_guardian_id_fkey(full_name, email, phone)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching student:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        *,
        class:classes(*)
      `)
      .eq('student_id', id)
      .order('enrolled_at', { ascending: false })

    const { data: notes } = await supabase
      .from('notes')
      .select(`
        *,
        author:profiles!notes_author_id_fkey(full_name),
        class:classes(title, start_time)
      `)
      .eq('student_id', id)
      .order('created_at', { ascending: false })

    const { data: payments } = await supabase
      .from('payments')
      .select(`
        *,
        class:classes(title, start_time)
      `)
      .eq('student_id', id)
      .order('transaction_date', { ascending: false })

    const { data: requests } = await supabase
      .from('private_lesson_requests')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      student,
      enrollments: enrollments || [],
      notes: notes || [],
      payments: payments || [],
      private_lesson_requests: requests || []
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInstructor()
    
    const supabase = await createClient()
    const { id } = await params

    const body = await request.json()

    const { data: student, error } = await supabase
      .from('students')
      .update(body)
      .eq('id', id)
      .select(`
        *,
        profile:profiles!students_profile_id_fkey(full_name, email, phone, date_of_birth),
        guardian:profiles!students_guardian_id_fkey(full_name, email, phone)
      `)
      .single()

    if (error) {
      console.error('Error updating student:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInstructor()
    
    const supabase = await createClient()
    const { id } = await params

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting student:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
