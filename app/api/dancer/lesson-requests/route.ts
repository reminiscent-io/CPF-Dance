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
