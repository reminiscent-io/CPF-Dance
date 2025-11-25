import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get all active lesson packs
    const { data: packs, error: packsError } = await supabase
      .from('lesson_packs')
      .select('*')
      .eq('is_active', true)
      .order('lesson_count', { ascending: true })

    if (packsError) {
      return NextResponse.json({ error: packsError.message }, { status: 500 })
    }

    // Get current student's purchases
    const student = await getCurrentDancerStudent()
    const { data: purchases, error: purchasesError } = await supabase
      .from('lesson_pack_purchases')
      .select('*')
      .eq('student_id', student.id)
      .order('purchased_at', { ascending: false })

    if (purchasesError) {
      return NextResponse.json({ error: purchasesError.message }, { status: 500 })
    }

    return NextResponse.json({ packs, purchases })
  } catch (error) {
    console.error('Error fetching lesson packs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
