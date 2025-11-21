import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { id } = await params

    const { data: classData, error } = await supabase
      .from('classes')
      .select(`
        *,
        studio:studios(name, city, state),
        enrollments(id, student_id)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching class:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    return NextResponse.json({ class: classData })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only instructors and admins can update classes' }, { status: 403 })
    }

    const supabase = await createClient()
    const { id } = await params
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
      price, // Legacy field
      pricing_model,
      base_cost,
      cost_per_person,
      cost_per_hour,
      tiered_base_students,
      tiered_additional_cost,
      is_cancelled,
      cancellation_reason
    } = body

    // Convert datetime-local format to ISO 8601 if needed
    let startTimeISO = start_time
    let endTimeISO = end_time

    if (start_time && start_time.includes('T') && !start_time.includes('Z')) {
      startTimeISO = new Date(start_time).toISOString()
    }

    if (end_time && end_time.includes('T') && !end_time.includes('Z')) {
      endTimeISO = new Date(end_time).toISOString()
    }

    const updateData: any = {}

    if (studio_id !== undefined) updateData.studio_id = studio_id || null
    if (class_type !== undefined) updateData.class_type = class_type
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (location !== undefined) updateData.location = location || null
    if (start_time !== undefined) updateData.start_time = startTimeISO
    if (end_time !== undefined) updateData.end_time = endTimeISO
    if (max_capacity !== undefined) updateData.max_capacity = max_capacity || null
    if (price !== undefined) updateData.price = price || null
    // Pricing fields
    if (pricing_model !== undefined) updateData.pricing_model = pricing_model
    if (base_cost !== undefined) updateData.base_cost = base_cost || null
    if (cost_per_person !== undefined) updateData.cost_per_person = cost_per_person || null
    if (cost_per_hour !== undefined) updateData.cost_per_hour = cost_per_hour || null
    if (tiered_base_students !== undefined) updateData.tiered_base_students = tiered_base_students || null
    if (tiered_additional_cost !== undefined) updateData.tiered_additional_cost = tiered_additional_cost || null
    if (is_cancelled !== undefined) updateData.is_cancelled = is_cancelled
    if (cancellation_reason !== undefined) updateData.cancellation_reason = cancellation_reason || null

    // Build query - admins can update any class, instructors only their own
    let query = supabase
      .from('classes')
      .update(updateData)
      .eq('id', id)

    // Instructors can only update their own classes
    if (profile.role === 'instructor') {
      query = query.eq('instructor_id', profile.id)
    }

    const { data: classData, error } = await query
      .select(`
        *,
        studio:studios(name, city, state)
      `)
      .single()

    if (error) {
      console.error('Supabase error updating class:', error)
      return NextResponse.json({
        error: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    if (!classData) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ class: classData })
  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only instructors and admins can delete classes' }, { status: 403 })
    }

    const supabase = await createClient()
    const { id } = await params

    // Build query - admins can delete any class, instructors only their own
    let query = supabase
      .from('classes')
      .delete()
      .eq('id', id)

    // Instructors can only delete their own classes
    if (profile.role === 'instructor') {
      query = query.eq('instructor_id', profile.id)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting class:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
