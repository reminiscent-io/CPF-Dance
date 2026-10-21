import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

// Stripe sales on this class's links that aren't linked to a dancer yet.
// A full-workshop sale sits on the first day, so any day of a workshop lists
// the whole workshop's.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInstructor()
    const supabase = await createClient()
    const { id } = await params

    const { data: cls, error: classError } = await supabase
      .from('classes')
      .select('id, series_id')
      .eq('id', id)
      .single()
    if (classError || !cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    let classIds = [cls.id]
    if (cls.series_id) {
      const { data: days } = await supabase.from('classes').select('id').eq('series_id', cls.series_id)
      if (days && days.length > 0) classIds = days.map(day => day.id)
    }

    const { data: purchases, error } = await supabase
      .from('class_purchases')
      .select('id, class_id, workshop_option, buyer_name, buyer_email, buyer_phone, amount_paid, purchased_at')
      .in('class_id', classIds)
      .is('student_id', null)
      .order('purchased_at', { ascending: true })

    if (error) {
      console.error('Error fetching class purchases:', error)
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
    }

    return NextResponse.json({ purchases: purchases || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
