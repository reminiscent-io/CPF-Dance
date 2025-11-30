import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireDancer } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireDancer()
    const supabase = await createClient()

    // Fetch public classes that are upcoming and not cancelled
    const now = new Date().toISOString()

    const { data: classes, error } = await supabase
      .from('classes')
      .select(`
        id,
        title,
        description,
        location,
        start_time,
        end_time,
        class_type,
        max_capacity,
        pricing_model,
        cost_per_person,
        base_cost,
        cost_per_hour,
        external_signup_url,
        studio:studios(name, city, state),
        instructor:profiles!classes_instructor_id_fkey(full_name),
        enrollments(id)
      `)
      .eq('is_public', true)
      .eq('is_cancelled', false)
      .gte('start_time', now)
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching public classes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add enrolled count to each class
    const classesWithCount = (classes || []).map(cls => ({
      ...cls,
      instructor: Array.isArray(cls.instructor) ? cls.instructor[0] : cls.instructor,
      enrolled_count: cls.enrollments?.length || 0
    }))

    return NextResponse.json({ classes: classesWithCount })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
