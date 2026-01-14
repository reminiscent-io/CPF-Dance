import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()

    // Fetch regular payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_method,
        payment_status,
        transaction_date,
        notes,
        receipt_url,
        created_at,
        class_id,
        classes (
          id,
          title,
          start_time
        )
      `)
      .eq('student_id', student.id)
      .order('transaction_date', { ascending: false })

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 })
    }

    // Fetch lesson pack purchases
    const { data: lessonPackPurchases, error: purchasesError } = await supabase
      .from('lesson_pack_purchases')
      .select(`
        id,
        purchased_at,
        remaining_lessons,
        expires_at,
        lesson_packs (
          id,
          name,
          lesson_count,
          price
        )
      `)
      .eq('student_id', student.id)
      .order('purchased_at', { ascending: false })

    if (purchasesError) {
      console.error('Error fetching lesson pack purchases:', purchasesError)
    }

    // Fetch lesson pack usage
    const { data: lessonPackUsage, error: usageError } = await supabase
      .from('lesson_pack_usage')
      .select(`
        id,
        lessons_used,
        used_at,
        lesson_pack_purchases!inner (
          id,
          student_id,
          lesson_packs (
            id,
            name
          )
        ),
        private_lesson_requests (
          id,
          requested_focus
        )
      `)
      .eq('lesson_pack_purchases.student_id', student.id)
      .order('used_at', { ascending: false })

    if (usageError) {
      console.error('Error fetching lesson pack usage:', usageError)
    }

    return NextResponse.json({
      payments: payments || [],
      lessonPackPurchases: lessonPackPurchases || [],
      lessonPackUsage: lessonPackUsage || []
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
