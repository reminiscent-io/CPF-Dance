import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudioAdmin } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireStudioAdmin()
    const supabase = await createClient()

    // Get all classes with instructor and enrollment count
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
        is_cancelled,
        max_capacity,
        profiles!classes_instructor_id_fkey(full_name),
        enrollments(count)
      `)
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Error fetching classes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formattedClasses = classes.map(cls => ({
      id: cls.id,
      title: cls.title,
      description: cls.description,
      location: cls.location,
      start_time: cls.start_time,
      end_time: cls.end_time,
      class_type: cls.class_type,
      is_cancelled: cls.is_cancelled,
      max_capacity: cls.max_capacity,
      instructor_name: (cls.profiles as any)?.full_name || 'Unknown',
      enrolled_count: Array.isArray(cls.enrollments) ? cls.enrollments.length : 0
    }))

    return NextResponse.json({ classes: formattedClasses })
  } catch (error) {
    console.error('Error in studio classes API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
