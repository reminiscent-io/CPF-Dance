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

    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        students (
          id,
          full_name,
          email
        )
      `)
      .eq('class_id', id)

    if (error) {
      console.error('Error fetching enrollments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to flatten the students object
    const transformedEnrollments = (enrollments || []).map((enrollment: any) => ({
      id: enrollment.students?.id || '',
      full_name: enrollment.students?.full_name || 'Unknown',
      email: enrollment.students?.email || ''
    }))

    return NextResponse.json({ enrollments: transformedEnrollments })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
