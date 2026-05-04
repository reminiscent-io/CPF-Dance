import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'
import { getStudentRemainingLessons, getDayOfLessonPrice } from '@/lib/lesson-credits'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInstructor()
    const { id: studentId } = await params
    const supabase = await createClient()

    const [remaining, dayOfPrice, packsResult] = await Promise.all([
      getStudentRemainingLessons(supabase, studentId),
      getDayOfLessonPrice(supabase),
      supabase
        .from('lesson_pack_purchases')
        .select('id, remaining_lessons, purchased_at, lesson_pack:lesson_packs(name, lesson_count)')
        .eq('student_id', studentId)
        .gt('remaining_lessons', 0)
        .order('purchased_at', { ascending: true })
        .limit(1)
    ])

    const nextPack = packsResult.data?.[0] ?? null
    const nextPackName = nextPack
      ? Array.isArray(nextPack.lesson_pack)
        ? nextPack.lesson_pack[0]?.name ?? null
        : (nextPack.lesson_pack as { name?: string } | null)?.name ?? null
      : null

    return NextResponse.json({
      remaining,
      dayOfPrice,
      nextPackName
    })
  } catch (error) {
    console.error('[instructor lesson-balance] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
