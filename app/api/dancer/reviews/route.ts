import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function GET() {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles:instructor_id(full_name, avatar_url)')
      .eq('student_id', student.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()
    const body = await request.json()

    const { instructor_id, rating, content } = body

    if (!instructor_id || typeof instructor_id !== 'string') {
      return NextResponse.json({ error: 'instructor_id is required' }, { status: 400 })
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Verify the instructor exists and has instructor role
    const { data: instructor, error: instructorError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', instructor_id)
      .eq('role', 'instructor')
      .single()

    if (instructorError || !instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 })
    }

    // Upsert: create or update the review (unique constraint on student_id + instructor_id)
    const { data, error } = await supabase
      .from('reviews')
      .upsert(
        {
          student_id: student.id,
          instructor_id,
          rating,
          content: content?.trim() || null,
        },
        { onConflict: 'student_id,instructor_id' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
