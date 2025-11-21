import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()
    
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const studioId = searchParams.get('studio_id')
    const classType = searchParams.get('class_type')
    const upcoming = searchParams.get('upcoming')

    let query = supabase
      .from('classes')
      .select(`
        *,
        studio:studios(name, city, state)
      `)
      .order('start_time', { ascending: true })

    if (studioId) {
      query = query.eq('studio_id', studioId)
    }

    if (classType) {
      query = query.eq('class_type', classType)
    }

    if (upcoming === 'true') {
      const now = new Date().toISOString()
      query = query.gte('start_time', now)
    }

    const { data: classes, error } = await query

    if (error) {
      console.error('Error fetching classes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const classesWithCount = (classes || []).map(cls => ({
      ...cls,
      enrolled_count: 0
    }))

    return NextResponse.json({ classes: classesWithCount })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (profile.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden: Only instructors can create classes' }, { status: 403 })
    }

    const supabase = await createClient()

    const body = await request.json()

    const {
      studio_id,
      class_type,
      title,
      description,
      location,
      start_time,
      end_time,
      max_capacity,
      price
    } = body

    // Convert datetime-local format to ISO 8601 if needed
    const startTimeISO = start_time.includes('T') && !start_time.includes('Z')
      ? new Date(start_time).toISOString()
      : start_time

    const endTimeISO = end_time.includes('T') && !end_time.includes('Z')
      ? new Date(end_time).toISOString()
      : end_time

    const insertData = {
      instructor_id: profile.id,
      studio_id: studio_id || null,
      class_type,
      title,
      description: description || null,
      location: location || null,
      start_time: startTimeISO,
      end_time: endTimeISO,
      max_capacity: max_capacity || null,
      price: price || null
    }

    console.log('Attempting to insert class:', insertData)

    const { data: classData, error } = await supabase
      .from('classes')
      .insert(insertData)
      .select(`
        *,
        studio:studios(name, city, state)
      `)
      .single()

    if (error) {
      console.error('Supabase error creating class:', error)
      return NextResponse.json({
        error: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    return NextResponse.json({ class: classData }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
