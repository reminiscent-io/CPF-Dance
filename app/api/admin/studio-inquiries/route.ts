import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    // Get all studio inquiries with studio information
    const { data: inquiries, error } = await supabase
      .from('studio_inquiries')
      .select(`
        id,
        studio_name,
        contact_name,
        contact_email,
        contact_phone,
        message,
        status,
        created_at,
        responded_at,
        studio_id,
        studios (
          name,
          address
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ inquiries })
  } catch (error) {
    console.error('Error fetching studio inquiries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()
    const { id, status } = await request.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'responded') {
      updateData.responded_at = new Date().toISOString()
      updateData.is_responded = true
    } else if (status === 'new') {
      updateData.is_responded = false
    }

    const { data, error } = await supabase
      .from('studio_inquiries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ inquiry: data })
  } catch (error) {
    console.error('Error updating inquiry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
