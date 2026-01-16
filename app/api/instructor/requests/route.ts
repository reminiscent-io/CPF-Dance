import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const profile = await requireInstructor()

    const supabase = await createClient()

    const { data: requests, error } = await supabase
      .from('private_lesson_requests')
      .select(`
        *,
        student:students(
          id,
          full_name,
          email,
          phone,
          profile:profiles!students_profile_id_fkey(full_name, email, phone)
        ),
        scheduled_class:classes!private_lesson_requests_scheduled_class_id_fkey(
          id,
          title,
          start_time,
          end_time
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireInstructor()
    
    const supabase = await createClient()
    const body = await request.json()
    const { id, status, scheduled_class_id } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const updateData: { status: string; scheduled_class_id?: string } = { status }
    if (scheduled_class_id) {
      updateData.scheduled_class_id = scheduled_class_id
    }

    const { data: updatedRequest, error } = await supabase
      .from('private_lesson_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ request: updatedRequest })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
