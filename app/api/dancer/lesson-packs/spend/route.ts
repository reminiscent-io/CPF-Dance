import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function POST(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()
    const { lesson_pack_purchase_id, private_lesson_request_id } = await request.json()

    if (!lesson_pack_purchase_id) {
      return NextResponse.json(
        { error: 'lesson_pack_purchase_id is required' },
        { status: 400 }
      )
    }

    // Get the purchase and verify it belongs to the student
    const { data: purchase, error: purchaseError } = await supabase
      .from('lesson_pack_purchases')
      .select('*')
      .eq('id', lesson_pack_purchase_id)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    if (purchase.student_id !== student.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (purchase.remaining_lessons <= 0) {
      return NextResponse.json(
        { error: 'No lessons remaining in this pack' },
        { status: 400 }
      )
    }

    // Create usage record
    const { data: usage, error: usageError } = await supabase
      .from('lesson_pack_usage')
      .insert({
        lesson_pack_purchase_id,
        private_lesson_request_id: private_lesson_request_id || null,
        lessons_used: 1
      })
      .select()
      .single()

    if (usageError) {
      return NextResponse.json({ error: usageError.message }, { status: 500 })
    }

    // Decrement remaining_lessons
    const { data: updatedPurchase, error: updateError } = await supabase
      .from('lesson_pack_purchases')
      .update({ remaining_lessons: purchase.remaining_lessons - 1 })
      .eq('id', lesson_pack_purchase_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ usage, purchase: updatedPurchase })
  } catch (error) {
    console.error('Error spending lesson:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
