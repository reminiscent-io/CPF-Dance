import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'
import { enrollStudent } from '@/lib/class-enrollment'
import type { WorkshopOption } from '@/lib/class-series'

export async function POST(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()
    const { class_id, option } = await request.json() as { class_id?: string; option?: WorkshopOption }

    if (!class_id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    const result = await enrollStudent(supabase, createAdminClient(), student.id, class_id, option)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, already_enrolled: result.already_enrolled },
        { status: result.status }
      )
    }

    return NextResponse.json({ enrollment: result.enrollment, enrolled_days: result.enrolled_days }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
