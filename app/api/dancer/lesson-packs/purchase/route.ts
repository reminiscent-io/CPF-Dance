import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function POST(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()
    const { lesson_pack_id } = await request.json()

    if (!lesson_pack_id) {
      return NextResponse.json(
        { error: 'lesson_pack_id is required' },
        { status: 400 }
      )
    }

    // Get the lesson pack
    const { data: pack, error: packError } = await supabase
      .from('lesson_packs')
      .select('*')
      .eq('id', lesson_pack_id)
      .single()

    if (packError || !pack) {
      return NextResponse.json(
        { error: 'Lesson pack not found' },
        { status: 404 }
      )
    }

    // For now, create a purchase record with remaining_lessons = lesson_count
    // In a real scenario, you'd integrate with Stripe here
    const { data: purchase, error: insertError } = await supabase
      .from('lesson_pack_purchases')
      .insert({
        student_id: student.id,
        lesson_pack_id: lesson_pack_id,
        remaining_lessons: pack.lesson_count
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ purchase }, { status: 201 })
  } catch (error) {
    console.error('Error creating lesson pack purchase:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
