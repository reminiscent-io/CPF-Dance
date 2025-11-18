import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireInstructor()

    const supabase = await createClient()
    const { id } = params

    const { data: studio, error } = await supabase
      .from('studios')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching studio:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
    }

    return NextResponse.json({ studio })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireInstructor()

    const supabase = await createClient()
    const { id } = params
    const body = await request.json()

    const {
      name,
      address,
      city,
      state,
      zip_code,
      contact_email,
      contact_phone,
      notes,
      is_active
    } = body

    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (zip_code !== undefined) updateData.zip_code = zip_code
    if (contact_email !== undefined) updateData.contact_email = contact_email
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: studio, error } = await supabase
      .from('studios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating studio:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
    }

    return NextResponse.json({ studio })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireInstructor()

    const supabase = await createClient()
    const { id } = params

    // Check if studio has any classes associated with it
    const { data: classes, error: classCheckError } = await supabase
      .from('classes')
      .select('id')
      .eq('studio_id', id)
      .limit(1)

    if (classCheckError) {
      console.error('Error checking classes:', classCheckError)
      return NextResponse.json({ error: 'Failed to verify studio usage' }, { status: 500 })
    }

    if (classes && classes.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete studio with associated classes. Mark as inactive instead.'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('studios')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting studio:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
