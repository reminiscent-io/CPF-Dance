import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()

    const { data: requests, error: requestsError } = await supabase
      .from('private_lesson_requests')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })

    if (requestsError) {
      return NextResponse.json({ error: requestsError.message }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Error fetching lesson requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()

    const body = await request.json()
    const { requested_focus, preferred_dates, additional_notes } = body

    if (!requested_focus) {
      return NextResponse.json(
        { error: 'Please describe what you would like to focus on' },
        { status: 400 }
      )
    }

    const { data: lessonRequest, error: insertError } = await supabase
      .from('private_lesson_requests')
      .insert({
        student_id: student.id,
        requested_focus,
        preferred_dates: preferred_dates || [],
        additional_notes,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ request: lessonRequest }, { status: 201 })
  } catch (error) {
    console.error('Error creating lesson request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    // Verify the request belongs to the current student
    const { data: lessonRequest, error: fetchError } = await supabase
      .from('private_lesson_requests')
      .select('student_id')
      .eq('id', id)
      .single()

    if (fetchError || !lessonRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    if (lessonRequest.student_id !== student.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from('private_lesson_requests')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lesson request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
