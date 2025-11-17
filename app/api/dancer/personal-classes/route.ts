import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the student record for this user
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('profile_id', user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
    }

    // Fetch personal classes
    const { data: personalClasses, error: classesError } = await supabase
      .from('personal_classes')
      .select('*')
      .eq('student_id', student.id)
      .order('start_time', { ascending: true })

    if (classesError) {
      console.error('Error fetching personal classes:', classesError)
      return NextResponse.json({ error: 'Failed to fetch personal classes' }, { status: 500 })
    }

    return NextResponse.json({ classes: personalClasses || [] })
  } catch (error) {
    console.error('Error in GET /api/dancer/personal-classes:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the student record for this user
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('profile_id', user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, instructor_name, location, start_time, end_time, notes, is_recurring } = body

    if (!title || !start_time) {
      return NextResponse.json(
        { error: 'Title and start time are required' },
        { status: 400 }
      )
    }

    // Create the personal class
    const { data: personalClass, error: insertError } = await supabase
      .from('personal_classes')
      .insert({
        student_id: student.id,
        title: title.trim(),
        instructor_name: instructor_name?.trim() || null,
        location: location?.trim() || null,
        start_time,
        end_time: end_time || null,
        notes: notes?.trim() || null,
        is_recurring: is_recurring || false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating personal class:', insertError)
      return NextResponse.json({ error: 'Failed to create personal class' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      class: personalClass
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/dancer/personal-classes:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the student record for this user
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('profile_id', user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
    }

    const body = await request.json()
    const { id, title, instructor_name, location, start_time, end_time, notes, is_recurring } = body

    if (!id || !title || !start_time) {
      return NextResponse.json(
        { error: 'ID, title, and start time are required' },
        { status: 400 }
      )
    }

    // Update the personal class
    const { data: personalClass, error: updateError } = await supabase
      .from('personal_classes')
      .update({
        title: title.trim(),
        instructor_name: instructor_name?.trim() || null,
        location: location?.trim() || null,
        start_time,
        end_time: end_time || null,
        notes: notes?.trim() || null,
        is_recurring: is_recurring || false,
      })
      .eq('id', id)
      .eq('student_id', student.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating personal class:', updateError)
      return NextResponse.json({ error: 'Failed to update personal class' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      class: personalClass
    })
  } catch (error) {
    console.error('Error in PUT /api/dancer/personal-classes:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the student record for this user
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('profile_id', user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Delete the personal class
    const { error: deleteError } = await supabase
      .from('personal_classes')
      .delete()
      .eq('id', id)
      .eq('student_id', student.id)

    if (deleteError) {
      console.error('Error deleting personal class:', deleteError)
      return NextResponse.json({ error: 'Failed to delete personal class' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/dancer/personal-classes:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
