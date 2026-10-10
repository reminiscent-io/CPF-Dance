import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
        series_id,
        max_capacity,
        pricing_model,
        cost_per_person,
        base_cost,
        cost_per_hour,
        external_signup_url,
        workshop_price,
        workshop_signup_url,
        workshop_full_only,
        instructor_id,
        studio:studios(name, city, state)
      `)
      .eq('is_public', true)
      .eq('is_cancelled', false)
      .gte('start_time', now)
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching public classes:', error)
      return NextResponse.json({ error: 'Failed to fetch public classes' }, { status: 500 })
    }

    const instructorIds = [...new Set((classes || []).map(c => c.instructor_id).filter(Boolean))]
    const instructorMap = new Map<string, { full_name: string | null }>()
    if (instructorIds.length > 0) {
      const { data: instructors } = await supabase
        .from('public_profiles')
        .select('id, full_name')
        .in('id', instructorIds)
      for (const p of instructors || []) {
        instructorMap.set(p.id, { full_name: p.full_name })
      }
    }

    // Dancers can only read their own enrollments under RLS, so an embedded
    // enrollments(id) would count 0 or 1. Head counts come from the service
    // role instead; only the totals are returned.
    const enrolledCounts = new Map<string, number>()
    const classIds = (classes || []).map(cls => cls.id)
    if (classIds.length > 0) {
      const { data: taken, error: countError } = await createAdminClient()
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)
      if (countError) {
        console.error('Error counting enrollments:', countError)
      }
      for (const row of taken || []) {
        enrolledCounts.set(row.class_id, (enrolledCounts.get(row.class_id) || 0) + 1)
      }
    }

    // Add enrolled count to each class
    const classesWithCount = (classes || []).map(cls => ({
      ...cls,
      instructor: instructorMap.get(cls.instructor_id) ?? { full_name: null },
      enrolled_count: enrolledCounts.get(cls.id) || 0
    }))

    return NextResponse.json({ classes: classesWithCount })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
