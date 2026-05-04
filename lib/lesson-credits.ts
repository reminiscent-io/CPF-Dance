import type { SupabaseClient } from '@supabase/supabase-js'

export type SpendResult =
  | { used: true; usageId: string; packPurchaseId: string; packName: string | null; remainingAfter: number }
  | { used: false }

export type RefundResult =
  | { refunded: true; usageId: string; packPurchaseId: string; remainingAfter: number }
  | { refunded: false }

interface SpendArgs {
  supabase: SupabaseClient
  studentId: string
  classId: string
  requestId: string | null
}

interface RefundArgs {
  supabase: SupabaseClient
  classId: string
  reason: string
}

export async function spendCreditForClass({
  supabase,
  studentId,
  classId,
  requestId
}: SpendArgs): Promise<SpendResult> {
  const { data: purchases, error: purchaseError } = await supabase
    .from('lesson_pack_purchases')
    .select('id, remaining_lessons, purchased_at, lesson_pack:lesson_packs(name)')
    .eq('student_id', studentId)
    .gt('remaining_lessons', 0)
    .order('purchased_at', { ascending: true })
    .limit(1)

  if (purchaseError) {
    console.error('[lesson-credits] Failed to look up purchases:', purchaseError)
    return { used: false }
  }

  const purchase = purchases?.[0]
  if (!purchase) return { used: false }

  const { data: usage, error: usageError } = await supabase
    .from('lesson_pack_usage')
    .insert({
      lesson_pack_purchase_id: purchase.id,
      private_lesson_request_id: requestId,
      class_id: classId,
      lessons_used: 1
    })
    .select('id')
    .single()

  if (usageError || !usage) {
    console.error('[lesson-credits] Failed to insert usage row:', usageError)
    return { used: false }
  }

  const remainingAfter = Math.max(0, purchase.remaining_lessons - 1)
  const { error: updateError } = await supabase
    .from('lesson_pack_purchases')
    .update({ remaining_lessons: remainingAfter })
    .eq('id', purchase.id)

  if (updateError) {
    console.error('[lesson-credits] Failed to decrement purchase, rolling back usage row:', updateError)
    await supabase.from('lesson_pack_usage').delete().eq('id', usage.id)
    return { used: false }
  }

  const packName = Array.isArray(purchase.lesson_pack)
    ? purchase.lesson_pack[0]?.name ?? null
    : (purchase.lesson_pack as { name?: string } | null)?.name ?? null

  return {
    used: true,
    usageId: usage.id,
    packPurchaseId: purchase.id,
    packName,
    remainingAfter
  }
}

export async function refundCreditForClass({
  supabase,
  classId,
  reason
}: RefundArgs): Promise<RefundResult> {
  const { data: usage, error: usageError } = await supabase
    .from('lesson_pack_usage')
    .select('id, lesson_pack_purchase_id, lessons_used')
    .eq('class_id', classId)
    .is('voided_at', null)
    .maybeSingle()

  if (usageError) {
    console.error('[lesson-credits] Failed to look up usage:', usageError)
    return { refunded: false }
  }
  if (!usage) return { refunded: false }

  const { data: purchase, error: purchaseError } = await supabase
    .from('lesson_pack_purchases')
    .select('id, remaining_lessons')
    .eq('id', usage.lesson_pack_purchase_id)
    .single()

  if (purchaseError || !purchase) {
    console.error('[lesson-credits] Failed to load purchase for refund:', purchaseError)
    return { refunded: false }
  }

  const { error: voidError } = await supabase
    .from('lesson_pack_usage')
    .update({ voided_at: new Date().toISOString(), voided_reason: reason })
    .eq('id', usage.id)

  if (voidError) {
    console.error('[lesson-credits] Failed to void usage:', voidError)
    return { refunded: false }
  }

  const remainingAfter = purchase.remaining_lessons + (usage.lessons_used || 1)
  const { error: bumpError } = await supabase
    .from('lesson_pack_purchases')
    .update({ remaining_lessons: remainingAfter })
    .eq('id', purchase.id)

  if (bumpError) {
    console.error('[lesson-credits] Failed to bump purchase remaining:', bumpError)
    return { refunded: false }
  }

  return {
    refunded: true,
    usageId: usage.id,
    packPurchaseId: purchase.id,
    remainingAfter
  }
}

export async function getStudentRemainingLessons(
  supabase: SupabaseClient,
  studentId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('lesson_pack_purchases')
    .select('remaining_lessons')
    .eq('student_id', studentId)

  if (error || !data) return 0
  return data.reduce((sum, row) => sum + (row.remaining_lessons || 0), 0)
}

export async function getDayOfLessonPrice(supabase: SupabaseClient): Promise<number | null> {
  const { data, error } = await supabase
    .from('lesson_packs')
    .select('price, lesson_count')
    .eq('is_active', true)

  if (error || !data || data.length === 0) return null

  let max = 0
  for (const pack of data) {
    if (!pack.lesson_count) continue
    const perLesson = Number(pack.price) / pack.lesson_count
    if (perLesson > max) max = perLesson
  }
  return max > 0 ? Math.round(max * 100) / 100 : null
}
