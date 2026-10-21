import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireInstructor } from '@/lib/auth/server-auth'
import { enrollStudent } from '@/lib/class-enrollment'
import type { WorkshopOption } from '@/lib/class-series'

// Link a paid Stripe sale to a dancer: enroll them in what they bought, then
// mark the sale linked.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; purchaseId: string }> }
) {
  try {
    await requireInstructor()
    const supabase = await createClient()
    const { purchaseId } = await params
    const { student_id } = await request.json()

    if (!student_id) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
    }

    // RLS limits this read to instructors and admins
    const { data: purchase, error: purchaseError } = await supabase
      .from('class_purchases')
      .select('id, class_id, workshop_option, student_id')
      .eq('id', purchaseId)
      .single()
    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }
    if (purchase.student_id) {
      return NextResponse.json({ error: 'This sale is already linked' }, { status: 400 })
    }

    // Head counts and the enrollment insert span dancers, so the service role
    // enrolls now that the caller is authorized.
    const admin = createAdminClient()
    const result = await enrollStudent(
      admin,
      admin,
      student_id,
      purchase.class_id,
      (purchase.workshop_option as WorkshopOption | null) ?? undefined
    )
    if (!result.ok && !result.already_enrolled) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { error: linkError } = await supabase
      .from('class_purchases')
      .update({ student_id })
      .eq('id', purchase.id)
    if (linkError) {
      console.error('Error linking purchase:', linkError)
      return NextResponse.json({ error: 'Failed to link purchase' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
