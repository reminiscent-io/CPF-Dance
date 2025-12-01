import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasInstructorPrivileges } from '@/lib/auth/privileges'

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

    if (!hasInstructorPrivileges(profile)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const studioId = searchParams.get('studio_id')
    const status = searchParams.get('status')

    // If instructor (not admin), filter to their studios
    if (profile?.role === 'instructor') {
      // Get studios where this instructor teaches classes
      const { data: instructorStudios, error: studiosError } = await supabase
        .from('classes')
        .select('studio_id')
        .eq('instructor_id', user.id)
        .neq('studio_id', null)

      if (studiosError) {
        console.error('Error fetching instructor studios:', studiosError)
        return NextResponse.json({ error: studiosError.message }, { status: 500 })
      }

      const studioIds = [...new Set((instructorStudios || []).map(c => c.studio_id))]
      if (studioIds.length === 0) {
        return NextResponse.json({ inquiries: [] })
      }

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
        .in('studio_id', studioIds)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: inquiries, error } = await query

      if (error) {
        console.error('Error fetching inquiries:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const enrichedInquiries = (inquiries || []).map((inquiry: any) => ({
        ...inquiry,
        is_responded: inquiry.is_responded ?? false,
        contact_method: inquiry.contact_method ?? null,
        response_notes: inquiry.response_notes ?? null,
        responded_at: inquiry.responded_at ?? null
      }))

      return NextResponse.json({ inquiries: enrichedInquiries })
    }

    // Admin gets all inquiries
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
