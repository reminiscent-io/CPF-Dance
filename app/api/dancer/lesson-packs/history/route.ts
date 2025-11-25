import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()

    // Get all purchases with related lesson pack info
    const { data: purchases, error: purchasesError } = await supabase
      .from('lesson_pack_purchases')
      .select(`
        id,
        student_id,
        lesson_pack_id,
        remaining_lessons,
        purchased_at,
        lesson_pack:lesson_packs(id, name, lesson_count, price)
      `)
      .eq('student_id', student.id)
      .order('purchased_at', { ascending: false })

    if (purchasesError) {
      return NextResponse.json({ error: purchasesError.message }, { status: 500 })
    }

    // Get all usage records for this student's packs
    const purchaseIds = purchases?.map(p => p.id) || []
    
    let usageData: any[] = []
    if (purchaseIds.length > 0) {
      const { data: usage, error: usageError } = await supabase
        .from('lesson_pack_usage')
        .select(`
          id,
          lesson_pack_purchase_id,
          private_lesson_request_id,
          lessons_used,
          used_at,
          private_lesson_requests(id, status, requested_focus, created_at)
        `)
        .in('lesson_pack_purchase_id', purchaseIds)
        .order('used_at', { ascending: false })

      if (usageError) {
        console.error('Error fetching usage:', usageError)
      } else {
        usageData = usage || []
      }
    }

    // Calculate total available
    const totalRemaining = purchases?.reduce((sum, p) => sum + p.remaining_lessons, 0) || 0

    return NextResponse.json({
      purchases,
      usage: usageData,
      totalRemaining
    })
  } catch (error) {
    console.error('Error fetching lesson pack history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
