import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin or instructor
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const studioId = searchParams.get('studio_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('studio_inquiries')
      .select(`
        id,
        studio_name,
        contact_name,
        contact_email,
        contact_phone,
        message,
        status,
        studio_id,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (studioId) {
      query = query.eq('studio_id', studioId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: inquiries, error } = await query

    if (error) {
      console.error('Error fetching inquiries:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add default values for optional columns that may not exist yet
    const enrichedInquiries = (inquiries || []).map((inquiry: any) => ({
      ...inquiry,
      is_responded: inquiry.is_responded ?? false,
      contact_method: inquiry.contact_method ?? null,
      response_notes: inquiry.response_notes ?? null,
      responded_at: inquiry.responded_at ?? null
    }))

    return NextResponse.json({ inquiries: enrichedInquiries })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
